---
title: 死磕Docker两天，就为了交个期末作业...
subtitle: 老师说自己就要个demo，结果我交了个企业级项目，还要塞一个智能体微服务？
date: 2026-05-23
---

大家好，我是 EthanYuan，今天聊聊我这几天都在忙啥。

事情是这样的：老师布置了一个期末作业，要做一个前后端 Web 项目。我灵机一动：直接把我的“昴云相册”源码交上去不就行了？刚高兴没多久，就意识到一个很严重的问题 —— 老师要的是那种很简单的 demo，最多连个 MySQL。而我的项目复杂度跟他要求的完全不是一个量级，什么 Redis、RabbitMQ，还有一堆依赖。人家要一个普通 demo，我硬塞了一个企业级项目进去。

老师要是自己装环境，那得装到怀疑人生。他肯定希望：**一键启动，直接看成果**。

于是我想到了 Docker。把项目打包成 Docker 镜像，老师一行命令拉下来就能跑，通过我给的地址直接访问，完美。

想用 Docker 得先了解它，下面我简单介绍一下。

### ❓ 什么是 Docker
> Docker 是一个开源的容器化平台，可以让开发者和运维人员用一致的方式部署项目。  
它把应用程序和它的所有依赖打包成镜像，再放到容器里运行。  
好处是：**在任何支持 Docker 的机器上都能跑，不用在本地装一堆环境**。
>

了解基本概念之后，还得知道 Docker 的几个核心组件，这样才好理解它怎么工作的。

+ 🪞 **镜像**  
由项目构建出来的只读模板，包含应用程序、运行库、配置文件。可以从 Docker Hub 拉取，也可以用 Dockerfile 定制构建。
+ 🪣 **容器**  
镜像是“图纸”，容器就是“工地上的房子”。容器是镜像运行起来的实例，有自己独立的文件系统、CPU、内存，但和宿主机共用操作系统内核。  
它和虚拟机的区别：**Docker 是进程级隔离，虚拟机是完全隔离**。虚拟机等于在一台机器里再开一台机器，资源消耗大、启动慢。Docker 启动快、资源省。
+ 🏠 **仓库**  
存镜像的地方。你想让别人拉你的项目在他电脑上跑，就得把镜像推送到仓库。Docker Hub 是最常用的公共仓库，也可以自己搭私有的。还支持版本控制。
+ 📂 **Dockerfile**  
自动化构建镜像的脚本。里面写一系列命令：从安装环境、复制源码、下载依赖，到执行启动命令，全自动完成。
+ 🌍 **Docker 网络和存储**  
可以通过自定义网络让不同容器之间通信或隔离。用数据卷（Volume）来持久化数据。  
我这边实际操作是：宿主机端口映射避免冲突，前端用 nginx 反向代理转发到后端容器地址；用数据卷挂载 MySQL、Redis、RabbitMQ 的数据，这样就算删掉容器或重新构建，数据也不会丢。

### 📦 Docker 怎么打包项目
首先得在电脑上装 Docker 服务，去官网下载 Docker Desktop：  
👉 [https://hub.docker.com/explore](https://hub.docker.com/explore)

#### 编写 Dockerfile
下面是我项目里用的 Dockerfile（后端的）：

```dockerfile
# 第一阶段：构建 Maven 环境
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -q

# 第二阶段：运行应用
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8124
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
```

前端的（注意有个小坑，我一开始把 `builder` 拼成了 `builde`，以为是什么大坑，就是自己马虎拼错了）：

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine

# 部署时如果不设置环境变量，将默认请求云端后端
ENV BACKEND_API_URL=xxx
ENV BACKEND_WS_URL=xxx

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173
```

其实这种 Dockerfile 完全可以用 AI 生成，自己看得懂每一步在干嘛就行。

#### 手动拉取基础镜像
```bash
# 后端基础环境
docker pull maven:3.9-eclipse-temurin-21
docker pull eclipse-temurin:21-jre

# 前端基础环境
docker pull node:20-alpine
docker pull nginxinc/nginx-unprivileged:alpine
```

这一步很有必要。我遇到过因为网络问题 + 本地找不到镜像，导致构建超时失败。  
**解决方法就是：先把基础镜像手动 pull 下来**。

#### 开始构建镜像
**1. 后端构建**

如果你只想单独构建应用镜像：

```bash
docker build -t picture-486-backend:0.0.1 .
```

还有一种更爽的方式：**构建应用 + 拉取中间件 + 本地启动**，全自动。

怎么做呢？  
先写一个 `application-docker.yml`，里面把中间件地址都配成 Docker 默认的地址和账号密码。  
再写一个 `docker-compose.yml`，这是本地从构建到启动一条龙服务的核心配置。里面定义好需要拉取的服务、环境变量、网络模式、数据卷挂载等。

这个 `docker-compose.yml` 主要是方便**本地测试**用的。真正部署到线上时，只需要应用镜像本身，不包括中间件。  
所以我在 Dockerfile 里默认用的是 `prod` 配置，而 `docker-compose.yml` 里会通过环境变量覆盖成 docker 配置。

**2. 前端构建**

步骤差不多，写 Dockerfile 然后构建：

```bash
docker build -t picture-486-frontend:0.0.1 .
```

不同的地方是：前端需要修改 nginx 反向代理配置，让它指向后端 Docker 容器的地址，否则访问不到后端。

我的后端 Docker 服务地址是 `http://picture-486-backend:8124/api/`，所以在 `nginx.conf` 里加了反向代理配置。  
默认用 prod 配置，docker-compose 里用 docker 配置覆盖，这样本地跑和线上部署都不用手改环境变量。

```nginx
# HTTP API 转发：Docker 后端项目
location ^~ /api/ {
    proxy_pass ${BACKEND_API_URL};
    # 其他 proxy 设置...
}
```

Dockerfile 里设置默认环境变量：

```dockerfile
ENV BACKEND_API_URL=xxx
```

docker-compose 里再覆盖：

```yaml
environment:
  - BACKEND_API_URL=http://picture-486-backend:8124/api/
```

> 💡 这里我发现一个小细节：  
我的前端完全是 AI 生成的，之前一直不知道本地联调是怎么请求到后端的。回头一看 nginx 配置里也没写，原来是因为 Vite 里直接写了本地后端地址。  
如果要打包成 Docker，就必须单独在 nginx.conf 里配置后端转发地址。  
果然学完再回头看，才能温故知新 🐶
>

#### 推送到 Docker Hub
先去 [https://hub.docker.com/repository/create](https://hub.docker.com/repository/create) 创建仓库。

然后登录、打标签、推送：

```bash
docker login

# 后端构建推送
docker build -t picture-486-backend:0.0.1 .
docker tag picture-486-backend:0.0.1 ethanyuan06/ethanyuan-repo:backend-0.0.1
docker push ethanyuan06/ethanyuan-repo:backend-0.0.1

# 前端构建推送
docker build -t picture-486-frontend:0.0.1 .
docker tag picture-486-frontend:0.0.1 ethanyuan06/ethanyuan-repo:frontend-0.0.1
docker push ethanyuan06/ethanyuan-repo:frontend-0.0.1
```

推送成功后，Docker Hub 上就能看到我传上去的镜像了。  
这时候别人就可以下载，或者直接部署到服务器

### 实际体验
本地跑项目，图片列表查询耗时：**3ms**。  
放到 Docker 里一跑，直接飙升到 **180ms**。

原因是 Docker 默认用桥接模式让多个容器通信，网络转发会多花时间。

不过这不是我们最关心的问题。Docker 最大的好处是**方便迁移和部署**。有性能瓶颈？直接升级服务器性能或者给容器扩容就行了。  
换服务器也不用重新打包源码和配置文件 —— Docker 全帮你打好了，自己手选还容易漏东西，部署五分钟提示失败那才叫难受。

另外，数据默认是存在容器里的。重启容器不会丢数据，但**删掉容器，数据就全没了**。  
生产环境严禁这样搞！而且有时候手忙脚乱，在 Docker 可视化界面随手一删，那真是坐牢了（bushi）。

解决方案就是 **数据卷挂载**，保证重建或删除容器时数据不丢。以 MySQL 为例：

```yaml
volumes:
  - mysql-data:/var/lib/mysql
```

Redis、RabbitMQ 也一样。

### 别人如何拉取我的镜像
1. 克隆我的项目源码  
2. 执行命令：

```bash
docker-compose -f docker-compose-public.yml up -d
```

3. 等一会儿，直接访问 `localhost:5173` 就能用了 ✅

## 🐳docker-compose 一条龙服务
### 1. 它是什么？为什么需要它？
前面我们说了，Docker 本身可以一个个地 `docker run` 启动容器。但你想一下，我的项目里有什么？

+ 前端（nginx 容器）
+ 后端（Spring Boot 容器）
+ MySQL
+ Redis
+ RabbitMQ

一共 5 个服务。如果每次都要手动 `docker run` 加上各种端口映射、环境变量、网络、数据卷…… 光是敲命令就能敲到手抽筋，而且还容易写错。

这时候就需要 **docker-compose**。

> 用一句人话说：  
**Docker 是“搬砖”，docker-compose 是“指挥搬砖”。**  
你写一个 `docker-compose.yml` 文件，把所有的服务、网络、数据卷都定义好，然后一行命令，全部启动。
>

它特别适合**本地开发、测试、小规模部署**的场景。老师要一键跑你的项目，你不用让他一个个 `docker run`，直接把 `docker-compose.yml` 给他，一条命令搞定。

### 2. 工作原理
执行 `docker-compose up -d` 的时候，它会干这几件事：

1. 读你写的 `docker-compose.yml` 配置文件
2. 检查有没有自定义的网络（没有就自动创建一个）
3. 按顺序启动服务（通过 `depends_on` 控制依赖关系）
4. 挂载数据卷（volume）和环境变量（environment）
5. 最后把所有的容器跑起来，并在后台运行（`-d`）

如果你修改了配置文件（比如改了端口或者环境变量），再执行一次 `up -d`，它会**自动对比当前运行的容器和新的配置**，发现有变化，就会先删掉旧容器，再根据新配置重建。  
这其实是我后来踩坑发现的，后面细说。

### 3. 拆解我写的 docker-compose.yml
下面我把我项目里的 `docker-compose.yml` 完整贴出来，然后一步步解释每个部分。

#### 版本号
```yaml
version: '3.8'
```

没啥好说的，就是告诉 docker-compose 用哪个版本的语法。`3.8` 够用了。

#### 网络
```yaml
networks:
  picture-network:
    driver: bridge
```

我定义了一个叫 `picture-network` 的自定义网络，驱动是 `bridge`（桥接）。所有容器都加入这个网络，它们之间可以通过**容器名**直接通信。  
比如前端配置里写的 `BACKEND_API_URL=http://picture-486-backend:8124/api/`，这里的 `picture-486-backend` 就是后端服务的 `container_name`，Docker 内网会自动把它解析成正确的 IP。

> 如果不自定义网络，容器之间也能通过 IP 通信，但 IP 会变。用自定义网络 + 容器名，稳定又优雅。
>

#### 数据卷
```yaml
volumes:
  mysql-data:
```

定义一个叫 `mysql-data` 的数据卷，用来持久化 MySQL 的数据。这样哪怕你 `docker-compose down` 再 `up`，数据也不会丢。  
后面在 MySQL 服务里挂载它：`- mysql-data:/var/lib/mysql`

> 之前我因为字符集乱码问题，删过容器又删过数据卷，就是因为这个 `mysql-data` 还得删掉才能彻底重置，命令是 `docker-compose down -v`。
>

#### 服务：MySQL
```yaml
mysql:
  image: mysql:8.0
  container_name: picture-mysql
  environment:
    MYSQL_ROOT_PASSWORD: 1234
    MYSQL_DATABASE: 486_picture
    MYSQL_CHARSET: utf8mb4
    MYSQL_COLLATION: utf8mb4_unicode_ci
  ports:
    - "13306:3306"
  volumes:
    - mysql-data:/var/lib/mysql
    - ./init.sql:/docker-entrypoint-initdb.d/init.sql
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p1234"]
    interval: 15s
    timeout: 10s
    retries: 10
    start_period: 30s
  networks:
    - picture-network
  restart: unless-stopped
```

+ `image`：从 Docker Hub 拉取 MySQL 8.0 镜像。
+ `container_name`：固定容器名字，方便其他容器访问。
+ `environment`：设置 root 密码、默认数据库名、字符集。注意字符集我特意用了 `utf8mb4`，不然 emoji 或者生僻字会乱码（踩过坑）。
+ `ports`：把容器的 3306 映射到宿主机的 13306，这样你本地也能用 Navicat 之类的工具连上去看数据。
+ `volumes`：第一个是数据卷持久化数据；第二个是把宿主机的 `./init.sql` 文件挂载到容器的初始化目录，容器第一次启动时自动执行这个 SQL 脚本，建表、插初始数据。
+ `healthcheck`：健康检查，每隔 15 秒执行一次 `mysqladmin ping`，判断 MySQL 是否真的就绪了。**这个非常重要，因为后端依赖 MySQL，如果 MySQL 还没完全启动好，后端就拼命连，会报错。**
+ `networks`：加入自定义网络。
+ `restart: unless-stopped`：除非你手动停止，否则容器挂了自动重启。

#### 服务：Redis
```yaml
redis:
  image: redis:7-alpine
  container_name: picture-redis
  ports:
    - "16379:6379"
  networks:
    - picture-network
  restart: unless-stopped
```

很简洁。Redis 不需要环境变量，也没有健康检查（后端不依赖它启动完成，所以无所谓）。端口映射到 16379 方便外部访问。

#### 服务：RabbitMQ
```yaml
rabbitmq:
  image: rabbitmq:3-management
  container_name: picture-rabbitmq
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  ports:
    - "5672:5672"
    - "15672:15672"
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "check_running"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - picture-network
  restart: unless-stopped
```

注意端口映射：  

+ `5672:5672` 是 RabbitMQ 的 AMQP 协议端口（程序连接用）。  
+ `15672:15672` 是管理界面端口（浏览器访问用）。

> 我之前脑子一抽，写过 `15672:5672`，结果管理界面死活访问不了，查了半天才发现把宿主端口和容器端口写反了。docker-compose 不会报错，但它会把宿主机的 15672 映射到容器的 5672，而这压根不是管理界面端口。正确的应该是 **宿主机端口:容器端口**。
>

健康检查用的是 `rabbitmq-diagnostics check_running`，判断 RabbitMQ 进程是否在跑。

#### 服务：后端 app
```yaml
app:
  image: ethanyuan06/ethanyuan-repo:backend-0.0.1
  container_name: picture-486-backend
  ports:
    - "18124:8124"
  environment:
    - SPRING_PROFILES_ACTIVE=docker
  depends_on:
    mysql:
      condition: service_healthy
    redis:
      condition: service_started
    rabbitmq:
      condition: service_healthy
  networks:
    - picture-network
  restart: unless-stopped
```

+ `image`：用的是我之前推送到 Docker Hub 的镜像。
+ `ports`：宿主 18124 → 容器 8124。
+ `environment`：设置 Spring Boot 的 profile 为 `docker`。这样后端会读取 `application-docker.yml` 里的配置，里面写的数据库、Redis、RabbitMQ 地址都是容器名（比如 `mysql:3306`）。
+ `depends_on`：定义启动顺序。但这里的重点不是“启动顺序”，而是**等待条件**：

这样可以避免后端容器起来了，MySQL 还没初始化完，导致连接失败。

    - `mysql` 要等到 `service_healthy`（健康检查通过）。
    - `redis` 只要 `service_started` 就行（Redis 启动很快）。
    - `rabbitmq` 也要等到健康检查通过。

#### 服务：前端
```yaml
frontend:
  image: ethanyuan06/ethanyuan-repo:frontend-0.0.1
  container_name: picture-486-frontend
  ports:
    - "5173:5173"
  environment:
    - BACKEND_API_URL=http://picture-486-backend:8124/api/
    - BACKEND_WS_URL=http://picture-486-backend:8124/api/ws/
  depends_on:
    - app
  networks:
    - picture-network
  restart: unless-stopped
```

前端镜像里是用 nginx 跑的静态页面。通过环境变量把后端地址传给 nginx，nginx 在运行时替换配置文件里的 `${BACKEND_API_URL}`。  
这样前端就知道该往哪个地址发请求了。

`depends_on` 只写了 `app`，没有写健康检查，因为前端不依赖后端完全就绪，页面先出来也没事，请求后端的时候后端还没好顶多报个错，刷新一下就好了。

### 4. 常用命令小抄
| 命令 | 作用 |
| --- | --- |
| `docker-compose up -d` | 后台启动所有服务 |
| `docker-compose down` | 停止并删除所有容器（网络还在，数据卷不删） |
| `docker-compose down -v` | 停止并删除容器、网络、**数据卷**（慎用，数据全丢） |
| `docker-compose logs -f` | 实时查看所有日志 |
| `docker-compose logs -f 服务名` | 只看某个服务的日志 |
| `docker-compose exec 服务名 bash` | 进入容器的 bash 终端 |
| `docker-compose restart` | 重启所有服务 |
| `docker-compose build` | 重新构建镜像（如果你改了 Dockerfile） |
| `docker-compose up -d --build` | 重新构建镜像并启动 |


---

### 5. 我踩过的两个坑
#### 坑一：RabbitMQ 端口写反了
之前我写的是 `"15672:5672"`，结果：

+ 程序连不上 RabbitMQ（因为程序连的是 5672，但容器里 5672 没映射出去）
+ 管理界面 `http://localhost:15672` 也打不开（因为宿主机 15672 映射到了容器的 5672，而容器里 5672 不是管理界面端口）

> 经验：端口映射必须是 `宿主机端口:容器端口`，不要凭感觉写。
>

#### 坑二：init.sql 字符集乱码
我把 `init.sql` 里的表结构写成了 `DEFAULT CHARSET=utf8`，但 MySQL 容器已经设置了 `utf8mb4`。结果中文数据插入后全变成问号。

折腾了很久，最后怎么解决的？

```bash
docker-compose down -v   # 删除容器 + 数据卷
```

然后把 `init.sql` 里的 `utf8` 全部改成 `utf8mb4`，再重新 `docker-compose up -d`，问题解决。

> 经验：字符集要统一，而且改完如果数据已经写乱了，必须删掉数据卷重来。
>

#### 坑三：阿里云 API Key 读不到了
突然发现后端一直报错 `API key not found`。明明昨天还能用的，怎么就没了？

思考半天才反应过来：**docker-compose 不会自动把宿主机的系统环境变量传给容器**。

最后在 `docker-compose.yml` 里这样写：

```yaml
app:
  environment:
    - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
```

Docker Compose 会在新建并启动容器时，自动读取项目根目录的 `.env` 的密钥替换进去。**环境变量只会注入一次**，所以要删掉容器再启动，不能简单重启。

> 经验：别把密钥硬编码在 YAML 里，用 `.env` + 变量引用，既安全又方便， `.env` 加进 `.gitignore`。
>

### 6. 怎么给别人用
我把 `docker-compose.yml` 和 `init.sql` 放到项目仓库里，老师或同学只需要：

1. 克隆我的项目源码  
2. 确保本地装了 Docker Desktop  
3. 在项目根目录执行：

```bash
docker-compose up -d
```

4. 等待拉取镜像和启动（第一次会慢一点）  
5. 浏览器打开 `http://localhost:5173`，直接使用 ✅

连 `docker pull` 都不用手动打，`docker-compose up` 会自动拉取镜像。  
这，就是“一键启动”的真谛。

好了，docker-compose 这一块就这样写完啦。  
最后补一句：生产环境别用 `docker-compose up` 裸跑，上 K8s 才是爸爸。但应付期末作业和让老师快乐评分，这套组合拳完全够了。

如果觉得有用，可以给我点个赞，或者自己去试试，遇到奇怪的坑欢迎回来吐槽。

