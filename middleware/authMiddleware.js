const jwt = require("jsonwebtoken");

module.exports = () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id || decoded._id,
        email: decoded.email,
        role: decoded.role,
      };
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};
