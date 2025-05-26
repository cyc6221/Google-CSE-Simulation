# 使用輕量 Node.js 映像
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 複製檔案進容器
COPY . .

# 安裝 npm 套件
RUN npm install

# 明確建立必要資料夾（避免掛載失敗）
RUN mkdir -p /app/data/users /app/data/encrypted

# 開放對外 port 8000
EXPOSE 8000

# 啟動程式
CMD ["node", "index.js"]