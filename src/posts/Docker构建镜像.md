\---

title: 死磕两天Docker，就为了交个期末作业...

subtitle: 老师：我要个demo，你给我塞了个企业级项目？你还说要加一个智能体微服务？

date: 2026-05-23

\---

大家好，我是EthanYuan，今天分享一下我这几天在忙的事。

事情是这样的，老师发了一个期末作业，要求做一个前后端web项目，我灵机一动，直接把我的昴云相册源码交上去不就行了，刚刚高兴没多久，我就意识到了一个很严重的问题：老师要我们做的是很简单的web项目，最多就调用MySQL数据库，而我的项目复杂度跟他要求的不是一个量级，什么Redis+RabbitMQ还有一堆依赖，要我交一个普通demo我硬是塞了一个企业级项目进去，老师装环境贼麻烦，他肯定需要一键启动项目看我的成果。

于是我想到了Docker，把我的项目打包上传到Docker，那老师就可以一行命令拉取镜像运行，然后通过我给的地址来访问了。用Docker首先得了解Docker，接下来我会介绍一下什么是Docker。

### ❓什么是Docker
:::info
Docker是一个开源的容器化平台，允许开发者与运维人员以一致的方式部署项目，通过将应用程序及其依赖构建成镜像并打包到容器中，实现应用程序在任何支持Docker的平台上运行，而不需要在本地机器装各种环境。

:::

了解Docker的基本概念后，还需要了解Docker的核心组件，方便我们了解Docker的工作原理：

🪞**镜像**

这是Docker的核心组件之一，由项目构建而来，它包含应用程序、运行库、配置文件，是一个只读模板，镜像可以由Docker Hub拉取，也可以用Dockerfile定制构建。

**🪣****容器**

容器是镜像的运行实例，使用Docker运行项目就是把镜像装到容器里跑，容器具有独立的文件系统、CPU、内存，但与宿主机共享操作系统内核，它与虚拟机的区别是：**Docker容器是进程级隔离，虚拟机是完全隔离**，虚拟机相当于是在一台机器上开另外一台机器，运行所需资源多且启动速度较慢，这也能体现Docker容器启动快、所需资源少的特性。

**🏠****仓库**

存储镜像的地方，当我们构建好项目后，如果想让别人拉取我们的项目在他的电脑运行，我们就需要将镜像推送到仓库中。Docker Hub是最常用的公共镜像仓库，但也可以创建一个私有的仓库，它同时支持版本控制，开发者可以基于特定的镜像版本进行开发部署。

**📂****Dockerfile**

自动化构建镜像的文件，包含一系列构建命令，可以指示Docker从安装环境、负责源码、下载依赖执行启动命令到构建完成全过程自动化

**🌍****Docker网络和存储**

通过自定义的网络配置，可以实现不同容器之间的通信与隔离，通过Docker的卷实现容器数据持久化。我利用宿主机端口映射，避免端口冲突，前端配置nginx反向代理，转发到后端Docker容器地址；用数据卷挂载，持久化MySQL、Redis、RabbitMQ的数据，保证不会因为删容器或重新构建而丢失



### 📦Docker怎么打包项目
你需要在电脑下载Docker服务，前往官网下载Docker Desktop

官网地址：[https://hub.docker.com/explore](https://hub.docker.com/explore)

#### 编写Dockerfile
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

```dockerfile
FROM node:20-alpine AS builde

WORKDIR /app

# Install dependencies with lockfile for reproducible builds.
COPY package*.json ./
RUN npm ci

# Build static assets.
COPY . .
RUN npm run build

# Lightweight runtime image for static hosting.
FROM nginxinc/nginx-unprivileged:alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173
```

这是我基于我项目内容所写的Dockerfile，这个文件完全可以用AI生成，自己看得懂每一步是干什么的就行。



#### 手动拉取基础镜像
```bash
# 后端基础环境
docker pull maven:3.9-eclipse-temurin-21
docker pull eclipse-temurin:21-jre

# 前端基础环境
docker pull node:20-alpine
docker pull nginxinc/nginx-unprivileged:alpine
```

这里我就遇到过因为**网络问题+本地找不到镜像**而超时构建失败，解决方法就是手动拉取基础运行环境的镜像。



#### 开始构建镜像
**1、后端构建**

如果你需要单独构建应用程序的镜像，使用以下命令：

```dockerfile
docker build -t picture-486-backend:0.0.1 .
```

还有一种方式：构建应用程序 -> 拉取各种中间件服务 -> 本地启动 全自动化

要达到这种效果，首先写一个配置文件`application-docker.yml`，里面配置的中间件访问地址，用的都是docker默认提供的，然后账户密码也都用默认的就行

再编写`docker-compose.yml`，这是本地从构建到启动容器一条龙服务的核心配置，主要编写需要拉取的服务、环境变量、网络模式、数据卷挂载等配置，这个配置文件就是方便本地测试用的，部署到线上服务器的仅仅是应用程序镜像而已，不包含中间件服务，所以我在Dockerfile中编写的启动命令默认用的是prod的配置，而`docker-compose.yml`中指定docker配置启动来覆盖。

成功后，效果如下

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/56443233/1779412452188-879f3bff-7e35-4796-a8ab-48af9a439343.png)

前往接口文档进行注册登录功能调试，均正常

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/56443233/1779412492888-bb906b72-58b4-4424-b10a-3d84a9f0b5fc.png)



**2、前端构建**

实际上步骤都差不多，编写Dockerfile然后用命令构建就行，不同的是，前端需要修改nginx反向代理配置，代理到后端Docker的地址，否则访问不到。

构建命令

```dockerfile
docker build -t picture-486-frontend:0.0.1 .
```

这里我的后端Docker服务地址是 `http://picture-486-backend:8124/api/`，我就在`nginx.conf`中添加了反向代理配置，默认用prod配置，docker-compose用docker配置覆盖，实现本地运行与线上部署零手搓环境变量

```dockerfile
# HTTP API 转发：Docker 后端项目
    location ^~ /api/ {
        proxy_pass ${BACKEND_API_URL};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 600s;
    }

# Dockerfile：部署时如果不设置环境变量，将默认请求云端后端
ENV BACKEND_API_URL=xxx
ENV BACKEND_WS_URL=xxx
# docker-compose 给nginx设置后端地址
environment:
  - BACKEND_API_URL=http://picture-486-backend:8124/api/
  - BACKEND_WS_URL=http://picture-486-backend:8124/api/ws/
```

💡这里我发现了一个小细节：

我的前端完全由AI生成，之前并不知道本地联调是怎么请求到后端的，我回去看了一下nginx配置也没有写，原来是是因为Vite写了本地后端项目的地址，所以能访问到，如果要打包为Docker，就需要单独在nginx.conf配置后端Docker转发地址

> 果然还是学完后温故知新🐶
>

#### 推送到Docker Hub
前往[https://hub.docker.com/repository/create](https://hub.docker.com/repository/create)创建仓库

先登录、再给镜像打标签（tag 镜像名:标签 用户名/仓库名:标签）、最后推送

```dockerfile
# 登录
docker login 
# 后端推送
docker tag picture-486-backend:0.0.1 ethanyuan06/ethanyuan-repo:backend-0.0.1 
docker push ethanyuan06/ethanyuan-repo:backend-0.0.1

# 前端推送
docker tag picture-486-frontend:0.0.1 ethanyuan06/ethanyuan-repo:frontend-0.0.1 
docker push ethanyuan06/ethanyuan-repo:frontend-0.0.1
```

推送成功后，Docker Hub会出现我推送上去的镜像，此时就可以给别人下载或者部署到服务器了。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/56443233/1779412404264-5c04dd4d-ec8f-4435-a4fa-be8ed53a8b37.png)

到这里，我的Docker项目构建和部署就完成了。



### 实际体验
本地跑项目图片列表查询耗时：3ms，放到Docker运行时就飙升到了180ms

原因是Docker默认使用桥接模式与多容器之间通信，所以网络转发会耗时

但这不是我们关心的问题，Docker最大的好处就是方便上传到服务器，有性能瓶颈直接升级服务器性能或者给容器扩容就行，Docker方便在迁移，换服务器可以直接拉取镜像，再就是不需要自己手动打包源码和一堆配置文件，Docker都帮你打包好了，自己手选还容易漏东西，部署五分钟告诉你失败岂不难受？



另外，数据存储默认是在容器层面的，重启容器不会删除数据，但是删掉容器所有数据都会丢失，生产环境严禁将数据存在容器里，而且很多时候手忙脚乱，不小心在Docker可视化界面随手删掉了，那真是坐牢了（bushi）

解决方案就是**数据卷挂载**，持久化数据，保证重建或删除容器不会丢失数据，以MySQL为例

```bash
volumes:
  - mysql-data:/var/lib/mysql
```

Redis、RabbitMQ的也是一样



别人如何拉取我的镜像

1、克隆我的项目源码

2、执行命令

```dockerfile
docker-compose -f docker-compose-public.yml up -d
```

3、等待后直接访问`localhost:5173`即可使用



### docker-compose
1. 它是什么？为什么需要docker-compose？
2. 工作原理

（问题）之前RabbitMQ端口映射写成了15672:5672，导致没法访问管理系统

> 改成<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">"5672:5672"、"15672:15672"，然后重新执行docker-compose，运行原理是： 检查配置文件 → 发现配置变了 → 销毁旧容器 → 用新配置创建新容器，完全是再读取一遍配置，彻底从头配环境启动容器</font>
>



init.sql插入数据时，字符集不一致导致乱码

需要删除容器并清空数据卷

```dockerfile
# 删除容器，清空数据卷
docker-compose down -v

# 重新启动
docker-compose up -d
```

