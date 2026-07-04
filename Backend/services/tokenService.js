const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return process.env.JWT_SECRET;
};

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || getJwtSecret();

const buildJwtPayload = (account) => ({
  id: account.id,
  role: account.role,
  username: account.username || account.email
});

const signAccessToken = (account) =>
  jwt.sign(buildJwtPayload(account), getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });

const signRefreshToken = (account) =>
  jwt.sign(buildJwtPayload(account), getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });

const verifyRefreshToken = (token) => jwt.verify(token, getRefreshSecret());

const issueTokens = (account) => {
  const accessToken = signAccessToken(account);
  const refreshToken = signRefreshToken(account);

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY
  };
};

module.exports = {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  issueTokens,
  verifyRefreshToken
};
