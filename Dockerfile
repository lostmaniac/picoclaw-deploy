FROM ubuntu:24.04

# 设置非交互式安装
ENV DEBIAN_FRONTEND=noninteractive

# 安装基础依赖、SSH和常用开发工具
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    nano \
    vim \
    tmux \
    htop \
    tree \
    iputils-ping \
    netcat-openbsd \
    telnet \
    dnsutils \
    iproute2 \
    iptables \
    sudo \
    psmisc \
    procps \
    lsof \
    strace \
    jq \
    ca-certificates \
    openssh-server \
    openssh-client \
    build-essential \
    git \
    rsync \
    zip \
    unzip \
    fish \
    zsh \
    fzf \
    ripgrep \
    bat \
    eza \
    && rm -rf /var/lib/apt/lists/*

# 安装Chromium浏览器
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium && \
    rm -rf /var/lib/apt/lists/*

# 验证Chromium安装
RUN chromium --version && \
    echo "Chromium installed successfully"

# 配置SSH - 只允许密钥登录，禁用密码，启用SFTP
RUN mkdir /var/run/sshd && \
    sed -i 's/#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config && \
    sed -i 's/#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && \
    sed -i 's/#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/#*UsePAM.*/UsePAM no/' /etc/ssh/sshd_config && \
    sed -i 's/^Subsystem sftp.*/Subsystem sftp internal-sftp/' /etc/ssh/sshd_config

# 创建SSH目录和authorized_keys文件（为空，用户需要手动添加公钥）
RUN mkdir -p /root/.ssh && touch /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys

# 安装uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# 安装nvm
ENV NVM_DIR="/root/.nvm"
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# 安装Node.js LTS并设置默认版本
RUN /bin/bash -c '. ~/.nvm/nvm.sh && nvm install --lts && nvm alias default node && npm config set registry https://registry.npmmirror.com'

# 创建系统级NVM配置，确保所有shell都能加载
RUN echo 'export NVM_DIR="/root/.nvm"' > /etc/profile.d/nvm.sh && \
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> /etc/profile.d/nvm.sh && \
    chmod +x /etc/profile.d/nvm.sh

# 设置静态Node.js路径 (v22是当前LTS版本)
ENV PATH="/root/.nvm/versions/node/v22.12.0/bin:$PATH" \
    NODE_PATH="/root/.nvm/versions/node/v22.12.0/lib/node_modules"

# 安装 picoclaw
ARG PICOCLAW_VERSION=latest
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        DOWNLOAD_ARCH="x86_64"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        DOWNLOAD_ARCH="arm64"; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    echo "Installing picoclaw for platform: $ARCH (download: $DOWNLOAD_ARCH)" && \
    LATEST_VERSION=$(curl -s https://api.github.com/repos/sipeed/picoclaw/releases/latest | python3 -c "import sys, json; print(json.load(sys.stdin).get('tag_name', 'latest'))" 2>/dev/null || echo "latest") && \
    echo "Latest picoclaw version: $LATEST_VERSION" && \
    DOWNLOAD_URL="https://github.com/sipeed/picoclaw/releases/download/${LATEST_VERSION}/picoclaw_Linux_${DOWNLOAD_ARCH}.tar.gz" && \
    echo "Downloading from: $DOWNLOAD_URL" && \
    curl -fsSL "$DOWNLOAD_URL" -o /tmp/picoclaw.tar.gz && \
    tar -xzf /tmp/picoclaw.tar.gz -C /tmp && \
    chmod +x /tmp/picoclaw && \
    mv /tmp/picoclaw /usr/bin/ && \
    rm /tmp/picoclaw.tar.gz && \
    picoclaw version && \
    picoclaw onboard

# 设置 apt 国内源（清华源）- Ubuntu 24.04 使用 DEB822 格式
RUN sed -i 's|URIs: http://archive.ubuntu.com/ubuntu|URIs: https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources && \
    sed -i 's|URIs: http://security.ubuntu.com/ubuntu|URIs: https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources

# 设置 pip 国内源（清华源）
RUN mkdir -p ~/.pip && \
    echo '[global]' > ~/.pip/pip.conf && \
    echo 'index-url = https://pypi.tuna.tsinghua.edu.cn/simple' >> ~/.pip/pip.conf && \
    echo 'trusted-host = pypi.tuna.tsinghua.edu.cn' >> ~/.pip/pip.conf

# 创建root目录备份，用于首次挂载时初始化
RUN mkdir -p /root.original && \
    cp -a /root/. /root.original/ && \
    rm -rf /root/.ssh/authorized_keys

# 复制启动脚本
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 启动SSH服务
CMD ["/usr/local/bin/entrypoint.sh"]
