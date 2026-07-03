---
title: 怎么本地跑就行，构建成Docker镜像就坏事了？😡
subtitle: 原因是构建时Redis的依赖版本为2.0.0，怎么没装我原有的版本？这篇文章分享我的踩坑经历
date: 2026-07-02
---

**问题本质**
- 容器里启动时报错：
  - `ImportError: cannot import name 'AskError' from 'redis.exceptions'`
- 这说明运行时真正被 `import redis` 加载的那份代码，不是你期望的 `redis-py 6.x` 正常代码。
- 后来我在容器里验证到一个非常关键的异常现象：
  - `importlib.metadata.version("redis")` 显示是 `6.4.0`
  - 但 `redis.__version__` 实际显示是 `2.0.0`
- 这说明镜像里的 Python 环境出现了**包元数据和实际模块代码不一致**的问题。

**我当时是怎么定位出来的**
我不是只看日志下结论，而是做了几组对比验证：

- 本地环境验证：
  - 本地 `redis` 是 `7.4.1`
  - `redis.exceptions.AskError` 存在
  - 所以本地运行没问题
- 容器环境验证：
  - 容器里 `dist-info` 记录的是 `redis 6.4.0`
  - 但真正 import 到的模块代码却表现成 `redis 2.0.0`
  - `AskError` 不存在
- 这就证明：
  - 不是单纯“版本号写错”
  - 而是**环境里残留了一份旧的 `redis` 模块代码，覆盖了新版本安装结果**

**错误原因**
直接原因是：
- 镜像里最终 import 到的是一份错误/陈旧的 `redis` 模块代码
- 这份代码不支持当前 `redis.asyncio` 依赖的异常类型 `AskError`
- 所以应用在导入 `from redis.asyncio import Redis` 时直接崩溃

**可能造成这种问题的原因**
这类问题一般不是业务代码写错，而是**构建环境污染**或**Python 站点包残留**。结合这次现象，可能原因主要有这些：

- `uv sync` 后，站点目录里残留了旧版 `redis` 代码目录，没有被正确替换掉
- 新旧安装方式混用，导致：
  - `dist-info` 是新的
  - 模块目录还是旧的
- Docker 构建层缓存或历史镜像层里保留了旧文件
- 某次依赖安装不完整，或者中途切换过安装工具、锁文件、Python 版本
- 本地环境和镜像环境完全不同：
  - 本地是全局 Python / 本地 venv
  - 镜像是 `.venv`
  - 所以“本地能跑”并不能证明“镜像能跑”

**我是怎么解决的**
我没有只做“再装一次 redis”，而是做了**彻底清理 + 强制重装**，确保模块代码和元数据重新对齐。

在 `Dockerfile` 里，`uv sync --frozen --no-dev` 之后增加了三步：

1. 删除 `.venv` 里的旧 `redis` 模块目录和所有 `redis-*.dist-info`
- 目的：先把可能残留的旧代码彻底清掉

2. 给虚拟环境补上 `pip`
- 因为 `.venv` 里原本没有 `pip`
- 用 `python -m ensurepip --upgrade`

3. 用 `pip --force-reinstall redis==6.4.0` 强制重装
- 目的：确保最终磁盘上的模块代码和 dist-info 完全一致

之后我在容器里再次验证：
- `importlib.metadata.version("redis") == 6.4.0`
- `redis.__version__ == 6.4.0`
- `hasattr(redis.exceptions, "AskError") == True`

这时 Redis 依赖问题就彻底消失了。

**后续又顺手暴露出的第二个问题**
Redis 版本修好之后，容器继续启动时又报：
- `Error 111 connecting to localhost:6379. Connection refused`

这个不是版本问题，而是配置问题：
- 代码里把 Redis 主机写死成了 `localhost`
- 在 Docker 容器里，`localhost` 指的是当前容器自己，不是 `docker-compose` 里的 `redis` 服务
- 所以后来我又把 Redis 配置改成从环境变量读取：
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`

这才让容器真正稳定跑起来。

**这次问题带来的经验**
以后要重点注意下面几类风险。

**1. 不要拿“本地能跑”推断“镜像一定能跑”**
- 本地和容器是两套不同环境
- 依赖、Python 版本、安装路径、缓存层都可能不同
- 这次就是典型例子：
  - 本地正常
  - 镜像里的实际模块代码已经污染

**2. 遇到依赖问题时，要同时验证“元数据版本”和“实际 import 版本”**
不要只看：
- `pip list`
- `uv pip list`
- `importlib.metadata.version(...)`

还要同时看：
- `python -c "import redis; print(redis.__version__, redis.__file__)"`

因为你真正运行的是 `import` 出来的模块代码，不是 `dist-info` 文字记录。

**3. 锁文件正确，不代表运行时一定干净**
- `pyproject.toml` 和 `uv.lock` 都可能是对的
- 但运行时仍可能因为残留文件、历史层、混装工具出现污染
- 所以“声明正确”和“环境干净”是两回事

**4. 容器构建里尽量避免依赖安装工具混乱**
以后最好保持一致：
- 要么全程 `uv sync`
- 要么清晰约定哪些包需要额外 pip 修复
- 不要让旧文件悄悄留在 `.venv/site-packages` 里

**5. 依赖异常时，优先做“容器内验证”**
最有效的排查方式是直接进入镜像环境验证：
```bash
python -c "import redis, redis.exceptions as e; print(redis.__version__, redis.__file__, hasattr(e,'AskError'))"
```
而不是只猜测。

**6. Docker 中服务地址不能写死 localhost**
对 Redis、RabbitMQ、MySQL 这类 compose 服务：
- 容器间通信要用服务名
- 比如：
  - `redis`
  - `rabbitmq`
  - `mysql`
- 不要写：
  - `localhost`
  - `127.0.0.1`

**未来如何防止再次发生**
建议你后续固定这么做：

- 在镜像构建后增加依赖自检
  - 至少检查关键三方包的真实 import 版本
- 对关键基础依赖做运行时校验
  - 如 `redis`、`pydantic`、`fastapi`
- 统一依赖安装路径和工具链
  - 尽量减少混用
- 遇到诡异依赖问题时，优先清理残留再重装，而不是只升级版本
- 对容器配置全部走环境变量
  - 服务地址不要硬编码
- 重要镜像构建完后，最好做一次最小启动验证
  - 不要只看 build 成功

**一句话总结**
这次 Redis 问题的根因不是“版本约束写错”，而是**镜像内 Python 环境发生了包残留/污染，导致 redis 的元数据版本和实际模块代码版本不一致**。  
解决方式是**删掉旧模块残留，再强制重装正确版本，并补上基于环境变量的容器内服务地址配置**。  
以后要避免再次踩坑，核心就是：**不要只信锁文件和包列表，要验证容器里实际 import 到的代码是谁。**
