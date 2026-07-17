# VaultKey 后端部署指南

## 架构说明

```
用户点击订阅 
  ↓
跳转爱发电支付页面（带 user_id 参数）
  ↓
用户完成支付
  ↓
爱发电发送 webhook → Cloudflare Worker
  ↓
Worker 验证订单 → 生成激活码 → 存入 KV
  ↓
前端轮询 /check-order?userId=xxx
  ↓
获取激活码 → 自动激活订阅
```

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

浏览器会打开，点击授权。

### 3. 创建 KV Namespace

```bash
wrangler kv:namespace create VAULTKEY_KV
```

会输出类似：
```
🌀 Creating namespace with title "vaultkey-backend-VAULTKEY_KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "VAULTKEY_KV", id = "abc123def456" }
```

复制 `id` 值，替换 `wrangler.toml` 中的 `YOUR_KV_NAMESPACE_ID`。

### 4. 配置爱发电

登录爱发电开发者后台：https://afdian.net/dashboard/dev

获取：
- **user_id**: 你的用户 ID
- **token**: API Token

替换 `wrangler.toml` 中的：
- `AFDIAN_USER_ID`
- `AFDIAN_TOKEN`

### 5. 部署 Worker

```bash
cd vaultkey-worker
npm install
npm run deploy
```

部署成功后会显示：
```
Published vaultkey-backend (1.23 sec)
  https://vaultkey-backend.your-subdomain.workers.dev
```

### 6. 配置爱发电 Webhook

在爱发电开发者后台，设置 Webhook URL：
```
https://vaultkey-backend.your-subdomain.workers.dev/webhook/afdian
```

### 7. 更新前端配置

在 `index.html` 中找到 `SUBSCRIPTION_CONFIG`，添加 Worker URL：

```javascript
const SUBSCRIPTION_CONFIG = {
  secret: 'VaultKey-2024-Subscription-Secret-Key-Do-Not-Share',
  durationDays: 365,
  price: '¥99',
  supportWechat: 'jx34102l',
  workerUrl: 'https://vaultkey-backend.your-subdomain.workers.dev',
  afdianUserId: 'YOUR_AFDIAN_USER_ID'
};
```

## API 端点

### POST /webhook/afdian
爱发电 webhook 回调端点。

**请求体**（爱发电发送）：
```json
{
  "ec": 200,
  "em": "ok",
  "data": {
    "type": "order",
    "order": {
      "out_trade_no": "202401010001",
      "user_id": "abc123",
      "plan_id": "plan_456",
      "total_amount": "99.00",
      "status": 2
    }
  }
}
```

**响应**：
```json
{
  "ec": 200,
  "em": "success"
}
```

### GET /check-order?userId=abc123
前端查询订单状态。

**响应**：
```json
{
  "status": "completed",
  "activationCode": "eyJpZCI6Im9yZGVyXzIwMjQwMTAxMDAwMSIsInRzIjoxNzA0MDY3MjAwMDAwLCJzaWciOiJhYmMxMjMifQ==",
  "amount": "99.00",
  "createdAt": 1704067200000
}
```

### GET /health
健康检查端点。

**响应**：
```json
{
  "status": "ok",
  "timestamp": 1704067200000
}
```

## 查看日志

```bash
npm run tail
```

实时查看 Worker 日志，方便调试。

## 本地开发

```bash
npm run dev
```

启动本地开发服务器，默认 http://localhost:8787

## 常见问题

### Q: Webhook 没有触发？
A: 检查爱发电后台的 Webhook URL 是否正确配置。

### Q: 签名验证失败？
A: 确保 `AFDIAN_TOKEN` 配置正确。

### Q: KV 存储失败？
A: 检查 `wrangler.toml` 中的 KV namespace ID 是否正确。

## 安全注意事项

1. **不要提交 `wrangler.toml` 到 Git**（包含敏感信息）
2. 使用 Cloudflare Secrets 管理敏感配置
3. 生产环境建议启用 Cloudflare Access 保护管理端点
