# VaultKey 订阅付费系统 - 使用指南

## 📋 系统概述

VaultKey 现已集成完整的订阅付费功能，采用**手动激活**模式：

1. 用户扫码支付 ¥99/年
2. 联系客服获取激活码
3. 用户输入激活码解锁全部功能

## 🔧 文件结构

```
password-manager/
├── index.html              # 主应用（含订阅验证）
├── key-generator.html      # 激活码生成器（管理员使用）
└── SUBSCRIPTION.md         # 本文档
```

## 🎯 快速开始

### 1. 部署应用

将 `index.html` 部署到你的服务器（Cloudflare Pages / Vercel / 任意静态托管）。

### 2. 配置收款码

编辑 `index.html` 中的支付页面：

```javascript
// 修改客服联系方式
const SUBSCRIPTION_CONFIG = {
  secret: '你的自定义密钥',           // 重要：同步修改生成器
  durationDays: 365,                  // 订阅时长（天）
  price: '¥99',                       // 显示价格
  supportWechat: 'your_wechat_id'     // 客服微信号
};
```

### 3. 替换收款二维码

找到 HTML 中的 `payment-qr-placeholder` 部分，替换为你的支付宝收款码图片：

```html
<div class="payment-qr">
  <img src="你的收款码图片URL" alt="支付宝收款码" style="width: 200px; height: 200px;">
</div>
```

或者使用 base64 编码的图片：
```html
<img src="data:image/png;base64,..." alt="支付宝收款码">
```

## 🎫 生成激活码

### 使用 key-generator.html

1. 打开 `key-generator.html`（建议本地打开，不要部署到公网）
2. 输入密钥（必须与 `index.html` 中的一致）
3. 填写用户ID（可选，用于追踪）
4. 点击"生成激活码"
5. 将生成的32位激活码发送给用户

### 激活码结构

激活码是 Base64 编码的 JSON，包含：
- `id`: 用户标识
- `ts`: 生成时间戳
- `sig`: HMAC-SHA256 签名

有效期：7天（可在代码中修改）

## 🔐 安全机制

### 激活码验证流程

1. **解码**：Base64 解码激活码
2. **解析**：提取用户ID、时间戳、签名
3. **时效检查**：验证是否在7天内
4. **签名验证**：使用密钥重新计算 HMAC，比对签名
5. **激活**：验证通过后，写入本地存储，设置365天有效期

### 密钥安全

⚠️ **重要警告**：

- 当前密钥存储在前端代码中，技术上可被提取
- 对于测试和小型应用，这已足够安全
- 生产环境建议：
  - 使用服务端验证激活码
  - 或定期更换密钥
  - 监控异常激活模式

## 📊 订阅状态管理

### 用户侧

- **设置页面**：显示订阅状态、剩余天数、到期日期
- **续费功能**：点击"续费"按钮重新进入支付页面
- **自动检测**：每次打开应用自动检查订阅状态

### 管理员侧

建议记录以下信息：
- 用户ID/订单号
- 激活码
- 生成时间
- 联系方式

可以使用表格或简单的数据库追踪。

## 🎨 自定义配置

### 修改订阅时长

```javascript
const SUBSCRIPTION_CONFIG = {
  secret: 'your-secret',
  durationDays: 730,  // 2年
  price: '¥168',
  supportWechat: 'your_wechat'
};
```

### 修改激活码有效期

在 `verifyActivationCode` 函数中：

```javascript
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
// 改为 30 天
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
```

### 修改价格显示

```javascript
price: '$14.99',  // 美元
price: '€12',     // 欧元
price: '¥99/年',  // 包含周期说明
```

## 🔄 工作流程

### 用户购买流程

```
1. 用户打开应用
   ↓
2. 显示支付页面（扫码支付 ¥99）
   ↓
3. 用户支付后截图联系客服
   ↓
4. 客服验证订单，生成激活码
   ↓
5. 用户输入激活码
   ↓
6. 本地验证激活码有效性
   ↓
7. 解锁应用，订阅生效365天
```

### 管理员操作流程

```
1. 收到用户付款截图
   ↓
2. 在支付宝后台确认收款
   ↓
3. 打开 key-generator.html
   ↓
4. 输入用户ID（订单号）
   ↓
5. 生成激活码
   ↓
6. 发送激活码给用户
   ↓
7. 记录到管理表格
```

## 🐛 常见问题

### Q: 用户说激活码无效？

**检查清单：**
1. 密钥是否一致（生成器和应用）
2. 激活码是否超过7天有效期
3. 激活码是否完整复制（32位）
4. 用户是否在正确的输入框粘贴

### Q: 用户订阅过期怎么办？

用户点击设置页面的"续费"按钮，或直接访问应用会显示支付页面，重新走购买流程即可。

### Q: 如何批量生成激活码？

可以使用 JavaScript 循环：

```javascript
for (let i = 1; i <= 10; i++) {
  const userId = `order_${Date.now()}_${i}`;
  await generateCode(userId);
  // 保存生成的激活码
}
```

### Q: 能否限制单个激活码只能使用一次？

当前实现是本地验证，无法跨设备限制。如需严格限制，需要：
- 服务端验证激活码
- 数据库记录已使用的激活码
- 或使用第三方激活码服务

## 📈 升级建议

### 短期（测试阶段）

- ✅ 当前手动激活方案已足够
- ✅ 适合验证付费意愿和转化率
- ✅ 成本低，快速上线

### 中期（小规模用户）

- 接入第三方激活码服务（如 License Spring）
- 使用 Cloudflare Workers 做简单验证
- 添加邮件自动发送激活码

### 长期（规模化）

- 完整接入支付平台 API（Stripe / 支付宝）
- 服务端验证 + 数据库
- 自动续费功能
- 多设备同步订阅状态

## 🔒 密钥管理最佳实践

### 生成强密钥

```javascript
// 使用 crypto 生成随机密钥
const array = new Uint8Array(32);
crypto.getRandomValues(array);
const key = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
console.log(key); // 64字符的十六进制字符串
```

### 定期轮换密钥

1. 生成新密钥
2. 更新 `key-generator.html` 和 `index.html`
3. 重新部署应用
4. 旧激活码将失效（用户需重新激活）

### 密钥存储

- ❌ 不要提交到 Git 仓库
- ❌ 不要分享给他人
- ✅ 使用密码管理器保存
- ✅ 记录密钥生成时间

## 📞 技术支持

如需帮助配置或遇到问题，请参考：
- VaultKey 主文档
- Web Crypto API 文档
- HMAC-SHA256 算法说明

---

**最后更新**: 2026-01-17  
**版本**: 1.0.0