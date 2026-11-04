const normalize = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, "").replace(/`/g, "").replace(/current_timestamp\(\)/g, "current_timestamp");
const normalizeDefault = (value, type) => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = normalize(value);
  if (/^decimal\(/i.test(type) && /^[-+]?\d+(?:\.\d+)?$/.test(normalized)) {
    const [whole, fraction = ""] = normalized.split(".");
    const trimmedFraction = fraction.replace(/0+$/, "");
    return `${whole.replace(/^\+/, "")}${trimmedFraction ? `.${trimmedFraction}` : ""}`;
  }
  return normalized;
};

const splitDefinitions = (body) => {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      if (ch === quote && body[i - 1] !== "\\") quote = null;
    } else if (["'", '"', "`"].includes(ch)) quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(body.slice(start).trim());
  return parts.filter(Boolean);
};

const getTableBody = (sql) => {
  const open = sql.indexOf("(");
  let depth = 0;
  let quote = null;
  for (let i = open; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      if (ch === quote && sql[i - 1] !== "\\") quote = null;
    } else if (["'", '"', "`"].includes(ch)) quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return sql.slice(open + 1, i);
  }
  throw new Error("Malformed CREATE TABLE statement in schema snapshot.");
};

const readType = (definition) => {
  const match = definition.match(/^([a-z]+)\b/i);
  if (!match) throw new Error(`Unrecognized column type: ${definition}`);
  let end = match[0].length;
  if (definition[end] === "(") {
    let depth = 0;
    for (; end < definition.length; end += 1) {
      if (definition[end] === "(") depth += 1;
      else if (definition[end] === ")" && --depth === 0) { end += 1; break; }
    }
  }
  let type = definition.slice(0, end).trim();
  if (/^boolean$/i.test(type)) type = "tinyint(1)";
  return { type, remainder: definition.slice(end) };
};

const expectedSchema = (schemaSql) => {
  const result = new Map();
  const statements = schemaSql.replace(/^--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    const tableName = statement.match(/^CREATE\s+TABLE\s+`?(\w+)`?\s*\(/i)?.[1];
    if (!tableName) throw new Error("Non CREATE TABLE statement in schema snapshot.");
    const columns = [];
    const indexes = [];
    const foreignKeys = [];
    for (const definition of splitDefinitions(getTableBody(statement))) {
      const fk = definition.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i);
      if (fk) {
        foreignKeys.push([fk[1].trim(), fk[2], fk[3].trim(), normalize((fk[4] || "RESTRICT").replace(/\s+/g, " "))].join("|"));
        continue;
      }
      const key = definition.match(/^(PRIMARY\s+KEY|UNIQUE\s+(?:KEY|INDEX)|(?:KEY|INDEX))\s*(?:`?\w+`?\s*)?\(([^)]+)\)/i);
      if (key) {
        indexes.push([/^PRIMARY/i.test(key[1]) || /^UNIQUE/i.test(key[1]) ? 1 : 0, key[2].split(",").map((x) => normalize(x)).join(",")].join("|"));
        continue;
      }
      const column = definition.match(/^`?(\w+)`?\s+([\s\S]+)$/);
      if (!column) throw new Error(`Unrecognized schema definition: ${definition}`);
      const { type, remainder } = readType(column[2]);
      const primaryKey = /\bPRIMARY\s+KEY\b/i.test(remainder);
      const defaultMatch = remainder.match(/\bDEFAULT\s+('(?:''|[^'])*'|CURRENT_TIMESTAMP(?:\(\))?|TRUE|FALSE|NULL|-?\d+(?:\.\d+)?)/i);
      let defaultValue = defaultMatch ? defaultMatch[1] : null;
      if (defaultValue && /^'.*'$/.test(defaultValue)) defaultValue = defaultValue.slice(1, -1).replace(/''/g, "'");
      if (/^true$/i.test(defaultValue || "")) defaultValue = "1";
      if (/^false$/i.test(defaultValue || "")) defaultValue = "0";
      if (/^null$/i.test(defaultValue || "")) defaultValue = null;
      columns.push({
        name: column[1], type: normalize(type),
        nullable: primaryKey || /\bNOT\s+NULL\b/i.test(remainder) ? "NO" : "YES",
        default: normalizeDefault(defaultValue, type),
        autoIncrement: /\bAUTO_INCREMENT\b/i.test(remainder),
        onUpdate: /\bON\s+UPDATE\s+CURRENT_TIMESTAMP(?:\(\))?/i.test(remainder)
      });
      if (primaryKey) indexes.push([1, normalize(column[1])].join("|"));
      else if (/\bUNIQUE\b/i.test(remainder)) indexes.push([1, normalize(column[1])].join("|"));
    }
    const indexedFirstColumns = new Set(indexes.map((item) => item.split("|")[1]?.split(",")[0]));
    for (const key of foreignKeys) {
      const foreignColumn = key.split("|")[0];
      if (!indexedFirstColumns.has(normalize(foreignColumn))) indexes.push([0, normalize(foreignColumn)].join("|"));
    }
    result.set(tableName, { columns, indexes: indexes.sort(), foreignKeys: foreignKeys.sort() });
  }
  return result;
};

const compareSchema = async (read, schemaSql) => {
  const expected = expectedSchema(schemaSql);
  const [tables] = await read(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' ORDER BY TABLE_NAME"
  );
  const actualNames = tables.map((row) => row.name).sort();
  const expectedNames = [...expected.keys()].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) throw new Error("Schema table list differs from snapshot.");

  for (const [table, snapshot] of expected) {
    const [columns] = await read(
      `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value, EXTRA AS extra, ORDINAL_POSITION AS position FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION`,
      [table]
    );
    const actualColumns = columns.map((row) => ({
      name: row.name,
      type: normalize(row.type),
      nullable: row.nullable,
      default: normalizeDefault(row.default_value, row.type),
      autoIncrement: /auto_increment/i.test(row.extra),
      onUpdate: /on update current_timestamp/i.test(row.extra)
    }));
    if (JSON.stringify(actualColumns) !== JSON.stringify(snapshot.columns)) throw new Error(`Column definition mismatch in ${table}.`);

    const [indexes] = await read(
      "SELECT INDEX_NAME AS name, NON_UNIQUE AS non_unique, SEQ_IN_INDEX AS seq, COLUMN_NAME AS column_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX",
      [table]
    );
    const groupedIndexes = new Map();
    for (const row of indexes) {
      const item = groupedIndexes.get(row.name) || { unique: Number(row.non_unique) === 0, columns: [] };
      item.columns.push(normalize(row.column_name));
      groupedIndexes.set(row.name, item);
    }
    const actualIndexes = [...groupedIndexes.values()].map((item) => [item.unique ? 1 : 0, item.columns.join(",")].join("|")).sort();
    if (JSON.stringify(actualIndexes) !== JSON.stringify(snapshot.indexes)) throw new Error(`Index definition mismatch in ${table}.`);

    const [foreignRows] = await read(
      `SELECT k.COLUMN_NAME AS column_name, k.REFERENCED_TABLE_NAME AS referenced_table, k.REFERENCED_COLUMN_NAME AS referenced_column, r.DELETE_RULE AS delete_rule, k.CONSTRAINT_NAME AS constraint_name, k.ORDINAL_POSITION AS position FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.TABLE_NAME = k.TABLE_NAME AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME WHERE k.CONSTRAINT_SCHEMA = DATABASE() AND k.TABLE_NAME = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.CONSTRAINT_NAME, k.ORDINAL_POSITION`,
      [table]
    );
    const actualForeignKeys = foreignRows.map((row) => [row.column_name, row.referenced_table, row.referenced_column, normalize(row.delete_rule)].join("|" )).sort();
    if (JSON.stringify(actualForeignKeys) !== JSON.stringify(snapshot.foreignKeys)) throw new Error(`Foreign key definition mismatch in ${table}.`);
  }
  return true;
};

module.exports = { expectedSchema, compareSchema, normalizeDefault };
