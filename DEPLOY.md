# VaultKey 部署指南

## 🚀 快速部署（推荐）

### 方式一：Cloudflare Pages（免费，推荐）

1. **准备工作**
   - 注册 Cloudflare 账号：https://dash.cloudflare.com
   - 将代码推送到 GitHub/GitLab

2. **部署步骤**
   ```bash
   # 方式 A：直接上传（无需 Git）
   cd password-manager
   # 将整个文件夹拖拽到 Cloudflare Pages 控制台
   
   # 方式 B：Git 集成
   # 1. 在 Cloudflare Pages 选择 "Connect to Git"
   # 2. 选择你的仓库
   # 3. 配置：
   #    - Build command: (留空)
   #    - Build output directory: .
   #    - Root directory: password-manager
   ```

3. **配置安全头**
   - 上传 `_headers` 文件（已包含在项目中）
   - 或手动在 Settings > Headers 添加

4. **访问**
   - 自动获得 `https://your-project.pages.dev` 域名
   - 可绑定自定义域名

---

### 方式二：Vercel（免费）

1. **部署步骤**
   ```bash
   # 安装 Vercel CLI
   npm install -g vercel
   
   # 部署
   cd password-manager
   vercel
   
   # 按提示操作：
   # - 首次部署选 Y
   # - 项目名称：vaultkey
   # - 目录：./
   # - 无需构建命令
   ```

2. **配置文件**
   - `vercel.json` 已包含安全头配置
   - 自动生效

3. **访问**
   - 获得 `https://vaultkey.vercel.app` 域名
   - 支持自定义域名

---

### 方式三：Netlify（免费）

1. **部署步骤**
   ```bash
   # 方式 A：拖拽部署
   # 访问 https://app.netlify.com/drop
   # 拖拽 password-manager 文件夹
   
   # 方式 B：CLI 部署
   npm install -g netlify-cli
   cd password-manager
   netlify deploy --prod
   ```

2. **配置**
   - Netlify 自动识别 `_headers` 文件
   - 无需额外配置

3. **访问**
   - 获得 `https://random-name.netlify.app` 域名
   - 可自定义子域名

---

### 方式四：GitHub Pages（免费）

1. **准备仓库**
   ```bash
   cd password-manager
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/vaultkey.git
   git push -u origin main
   ```

2. **启用 Pages**
   - 进入仓库 Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - 保存

3. **访问**
   - 等待 1-2 分钟
   - 访问 `https://YOUR_USERNAME.github.io/vaultkey`

4. **安全头限制**
   - ⚠️ GitHub Pages 不支持自定义 HTTP 头
   - 但 HTML 内已包含 CSP meta 标签
   - 建议改用 Cloudflare Pages

---

## 🖥️ 自托管部署

### 方式五：Nginx（生产推荐）

1. **安装 Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **部署文件**
   ```bash
   sudo mkdir -p /var/www/vaultkey
   sudo cp password-manager/index.html /var/www/vaultkey/
   sudo chown -R www-data:www-data /var/www/vaultkey
   ```

3. **配置 Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/vaultkey
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
       
       add_header X-Content-Type-Options nosniff always;
       add_header X-Frame-Options DENY always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy no-referrer always;
       add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
       add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.google.com; connect-src 'none'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'" always;
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
       add_header Cache-Control "no-store, no-cache, must-revalidate" always;
       add_header Pragma no-cache always;
       
       root /var/www/vaultkey;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location ~ /\. {
           deny all;
       }
   }
   ```

4. **启用站点**
   ```bash
   sudo ln -s /etc/nginx/sites-available/vaultkey /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **获取 SSL 证书**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

### 方式六：Docker（容器化）

项目已包含 `Dockerfile` 和 `docker-nginx.conf`，直接构建运行：

```bash
cd password-manager
docker build -t vaultkey .
docker run -d -p 8080:80 --name vaultkey vaultkey

# 访问 http://localhost:8080

# 生产环境建议用 docker-compose：
docker-compose up -d
```

---

## 🔒 安全最佳实践

### 域名和 SSL

- **所有部署方案都应启用 HTTPS**
- 免费证书：Let's Encrypt（Nginx/Caddy 自动申请）
- Cloudflare Pages / Vercel / Netlify 自带免费 SSL

### 访问控制（企业使用）

1. **Cloudflare Access**（推荐）
   - 添加邮箱验证、IP 限制、2FA

2. **Nginx Basic Auth**
   ```bash
   sudo apt install apache2-utils
   sudo htpasswd -c /etc/nginx/.htpasswd username
   ```
   在 Nginx location 块中添加：
   ```nginx
   auth_basic "VaultKey";
   auth_basic_user_file /etc/nginx/.htpasswd;
   ```

3. **IP 白名单**
   ```nginx
   allow 192.168.1.0/24;   # 公司内网
   allow 203.0.113.10;     # 固定 IP
   deny all;
   ```

---

## 📋 部署对比表

| 方案 | 成本 | 难度 | HTTPS | 安全头 | 适合场景 |
|------|------|------|-------|--------|----------|
| Cloudflare Pages | 免费 | ⭐ | 自动 | ✅ | 个人/小团队 |
| Vercel | 免费 | ⭐ | 自动 | ✅ | 个人/小团队 |
| Netlify | 免费 | ⭐ | 自动 | ✅ | 个人/小团队 |
| GitHub Pages | 免费 | ⭐⭐ | 自动 | ❌ | 开源项目 |
| Nginx 自托管 | 服务器费用 | ⭐⭐⭐ | 需配置 | ✅ | 企业生产 |
| Docker | 服务器费用 | ⭐⭐ | 需配置 | ✅ | 企业/容器化 |

---

## ⚠️ 重要提醒

1. **数据仅存于用户浏览器**：你的服务器不存储任何密码数据，这是架构优势也是责任——用户需自行备份
2. **HTTPS 必须开启**：Web Crypto API 在部分浏览器要求安全上下文（HTTPS）
3. **定期更新**：关注安全更新，重新部署即可
4. **备份提醒**：建议在应用外提醒用户定期导出加密备份
