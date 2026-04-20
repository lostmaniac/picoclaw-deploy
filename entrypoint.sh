#!/bin/bash

# 为所有shell会话加载NVM
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 为zsh添加NVM配置
if [ -f ~/.zshrc ] && ! grep -q "NVM_DIR" ~/.zshrc; then
    echo '' >> ~/.zshrc
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.zshrc
fi

# 检查 /root 目录是否为空或只包含挂载的目录
# 如果是，从备份目录复制所有文件
file_count=$(ls -la /root | wc -l)
if [ "$file_count" -le 3 ]; then
    echo "Initializing /root directory from backup..."
    cp -a /root.original/. /root/
    truncate -s 0 /root/.ssh/authorized_keys
fi

# 生成RSA密钥（如果不存在）
if [ ! -f /root/.ssh/id_rsa ]; then
    echo "Generating RSA key pair..."
    ssh-keygen -t rsa -b 4096 -f /root/.ssh/id_rsa -N "" -q
fi

# 检查authorized_keys是否包含公钥，不一致则写入
PUB_KEY=$(cat /root/.ssh/id_rsa.pub)
AUTH_FILE="/root/.ssh/authorized_keys"
if ! grep -qF "$PUB_KEY" "$AUTH_FILE" 2>/dev/null; then
    echo "Writing public key to authorized_keys..."
    echo "$PUB_KEY" >> "$AUTH_FILE"
fi

# 启动SSH服务
echo "Starting SSH service..."
mkdir -p /var/run/sshd
/usr/sbin/sshd
until nc -z localhost 22; do
    sleep 0.5
done
echo "SSH service is running on port 22"

# 启动Chromium无头模式（仅browser变体）
if command -v chromium &>/dev/null; then
    echo "Starting Chromium headless (Mac M1 emulation)..."
    mkdir -p /root/browse_data

    # 生成持久化的指纹种子（每个容器实例唯一，重启不变）
    SEED_FILE=/root/browse_data/.fp_seed
    if [ ! -f "$SEED_FILE" ]; then
        od -An -N4 -tu4 /dev/urandom | tr -d ' \n' > "$SEED_FILE"
    fi
    echo "const INSTANCE_SEED = $(cat "$SEED_FILE");" > /root/chrome-extension/seed.js

    CHROME_VER=$(chromium --version | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)
    chromium \
        --headless=new \
        --disable-gpu \
        --no-sandbox \
        --disable-blink-features=AutomationControlled \
        --force-device-scale-factor=2 \
        --remote-debugging-port=9222 \
        --user-data-dir=/root/browse_data \
        --window-size=1440,900 \
        --user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VER} Safari/537.36" \
        --load-extension=/root/chrome-extension \
        &
fi

# 启动PicoClaw网关
exec picoclaw gateway -E
