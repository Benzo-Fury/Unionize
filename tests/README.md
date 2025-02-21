# 🧪 Tests

## ✅ When Should You Write a Test?
Tests ensure critical parts of the bot work correctly across deployments. However, not all code needs testing.

### **Write a test if:**
- The code **depends on external systems** (databases, APIs, environment variables).
- The function **performs complex logic** (data transformations, authentication, security).
- The failure would **cause major issues** in your bot.
- The function **changes often**, increasing the risk of breaking it.

### **You don’t need a test if:**
- The function is **pure and deterministic** (e.g., string formatting, basic math).
- It doesn’t **depend on external dependencies** (e.g., APIs, databases).
- **Failure wouldn’t break core functionality.**

🚀 **Focus on testing what might break on deployment, not simple helper functions!**
