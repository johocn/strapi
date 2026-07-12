# 鏈嶅姟鍣ㄥ揩閫熷畨瑁呰璁?鈥?Strapi + Vendure + 鍓嶇澶氱珯鐐?
> 鏃ユ湡锛?026-07-12
> 鐜锛氶樋閲屼簯 2G 鍐呭瓨 / 40G 纾佺洏 / 1Panel锛堝凡 Docker 瀹夎 PostgreSQL + Redis锛?> 鍩熷悕锛氬瀛愬煙鍚嶏紝浠呮毚闇?80/443 绔彛

## 1. 鑳屾櫙涓庣洰鏍?
### 1.1 鐜扮姸
- 鏈湴寮€鍙戜娇鐢?`E:\code\basic` 鐩綍涓嬬殑 Strapi 5 椤圭洰锛屽寘鍚?12+ 涓?`zhao-*` 鎻掍欢
- Vendure 鍚庣鍜?4 涓墠绔紙vshop/shop/site/dsite锛変负鐙珛浠撳簱
- 鏈嶅姟鍣ㄤ负闃块噷浜?2G 鍐呭瓨銆?0G 纾佺洏锛屽凡閫氳繃 1Panel 瀹夎 Docker 杩愯 PostgreSQL + Redis
- 鐜版湁 Dockerfile 涓哄闃舵鏋勫缓锛屼絾 2G 鍐呭瓨涓?Docker 鏋勫缓 + 杩愯 Strapi 鏋佹槗 OOM

### 1.2 鐩爣
- **鏈湴鏋勫缓锛屾湇鍔″櫒鐩存帴杩愯**锛氭墍鏈夊悗绔湪鏈湴 `npm run build` 鍚庢彁浜?dist/build锛屾湇鍔″櫒 `git pull` 鍚庣洿鎺ヨ繍琛?- **鍓嶇閫氳繃 1Panel 缃戠珯绠＄悊**锛? 涓墠绔粨搴撳湪鏈嶅姟鍣?git clone锛?Panel 娣诲姞缃戠珯鎸囧悜瀵瑰簲 dist 鐩綍锛孲SL/鍩熷悕鐢遍潰鏉跨鐞?- **浠呮毚闇?80/443**锛氭墍鏈夋湇鍔￠€氳繃 Nginx锛?Panel 鍐呯疆 OpenResty锛夊弽鍚戜唬鐞?- **浣庡唴瀛樺崰鐢?*锛?G 鍐呭瓨涓?Strapi + Vendure + PostgreSQL + Redis 绋冲畾杩愯

### 1.3 鍘熷垯
- 鍚庣锛圫trapi + Vendure锛夌敤 PM2 绠＄悊杩涚▼锛孌ocker 浠呯敤浜?PostgreSQL + Redis
- `.gitignore` 鍏佽 `dist/` 鍜?`build/` 鎻愪氦鍒?git
- 鏈嶅姟鍣?`git pull` + `npm ci --production` 鍚庣洿鎺ヨ繍琛岋紝涓嶅仛浠讳綍缂栬瘧/鏋勫缓
- 4 涓墠绔粨搴撳湪鏈嶅姟鍣?clone锛?Panel 缃戠珯闈㈡澘绠＄悊鍩熷悕鍜?SSL

## 2. 浠撳簱涓庤繙绋嬪叧绯?
| 鏈湴鐩綍 | GitHub 杩滅▼ | 鏈嶅姟鍣ㄩ儴缃茶矾寰?| 杩愯鏂瑰紡 |
|---------|-----------|--------------|---------|
| `E:\code\basic` | `git@github.com:johocn/strapi.git` | `/opt/joho/strapi/` | PM2 Node.js |
| 锛堢嫭绔嬩粨搴擄級 | `git@github.com:johocn/vendure.git` | `/opt/joho/vendure/` | PM2 Node.js |
| 锛堢嫭绔嬩粨搴擄級 | `git@github.com:johocn/vshop.git` | `/opt/joho/vshop/` | 1Panel 缃戠珯鎸囧悜 `vshop/dist/` |
| 锛堢嫭绔嬩粨搴擄級 | `git@github.com:johocn/shop.git` | `/opt/joho/shop/` | 1Panel 缃戠珯鎸囧悜 `shop/dist/` |
| 锛堢嫭绔嬩粨搴擄級 | `git@github.com:johocn/site.git` | `/opt/joho/site/` | 1Panel 缃戠珯鎸囧悜 `site/dist/` |
| 锛堢嫭绔嬩粨搴擄級 | `git@github.com:johocn/dsite.git` | `/opt/joho/dsite/` | 1Panel 缃戠珯鎸囧悜 `dsite/dist/` |

## 3. 鏈嶅姟鍣ㄧ洰褰曞竷灞€

```
/opt/joho/
鈹溾攢鈹€ strapi/                    # git clone git@github.com:johocn/strapi.git strapi
鈹?  鈹溾攢鈹€ node_modules/          # npm ci --production锛堟湇鍔″櫒瀹夎锛?鈹?  鈹溾攢鈹€ dist/                  # 棰勬瀯寤哄悗鎻愪氦鍒?git
鈹?  鈹溾攢鈹€ build/                 # 棰勬瀯寤哄悗鎻愪氦鍒?git锛堥渶淇敼 .gitignore锛?鈹?  鈹溾攢鈹€ config/                # plugins.ts 浣跨敤 resolve: ./plugins/zhao-*
鈹?  鈹溾攢鈹€ plugins/               # 鎵€鏈?zhao-* 鎻掍欢锛坉ist 棰勬瀯寤哄悗鎻愪氦锛?鈹?  鈹?  鈹溾攢鈹€ zhao-auth/dist/
鈹?  鈹?  鈹溾攢鈹€ zhao-website/dist/
鈹?  鈹?  鈹斺攢鈹€ ...
鈹?  鈹溾攢鈹€ public/uploads/        # 涓婁紶鏂囦欢锛堟寔涔呭寲锛屾墜鍔ㄥ垱寤猴級
鈹?  鈹溾攢鈹€ .env                   # 浠?.env.example 澶嶅埗鍚庣紪杈?鈹?  鈹斺攢鈹€ package.json
鈹?鈹溾攢鈹€ vendure/                   # git clone git@github.com:johocn/vendure.git vendure
鈹?  鈹溾攢鈹€ node_modules/          # npm ci --production锛堟湇鍔″櫒瀹夎锛?鈹?  鈹溾攢鈹€ dist/                  # 棰勬瀯寤哄悗鎻愪氦
鈹?  鈹溾攢鈹€ assets/                # 涓婁紶鏂囦欢
鈹?  鈹溾攢鈹€ .env                   # 浠?vendure 鐨?.env.example 澶嶅埗鍚庣紪杈?鈹?  鈹斺攢鈹€ package.json
鈹?鈹溾攢鈹€ vshop/                     # git clone锛堝墠绔?锛?鈹?  鈹斺攢鈹€ dist/                  # 1Panel 缃戠珯鎸囧悜姝ょ洰褰?鈹溾攢鈹€ shop/                      # git clone锛堝墠绔?锛?鈹?  鈹斺攢鈹€ dist/                  # 1Panel 缃戠珯鎸囧悜姝ょ洰褰?鈹溾攢鈹€ site/                      # git clone锛堝墠绔?锛?鈹?  鈹斺攢鈹€ dist/                  # 1Panel 缃戠珯鎸囧悜姝ょ洰褰?鈹溾攢鈹€ dsite/                     # git clone锛堝墠绔?锛?鈹?  鈹斺攢鈹€ dist/                  # 1Panel 缃戠珯鎸囧悜姝ょ洰褰?鈹?鈹溾攢鈹€ ecosystem.config.js        # PM2 閰嶇疆锛堢敱 install.sh 鐢熸垚锛?鈹溾攢鈹€ strapi.env                 # Strapi 鐜鍙橀噺锛堟墜鍔ㄧ紪杈戯級
鈹溾攢鈹€ vendure.env                # Vendure 鐜鍙橀噺锛堟墜鍔ㄧ紪杈戯級
鈹溾攢鈹€ install.sh                 # 瀹夎鑴氭湰
鈹斺攢鈹€ nginx-template.conf        # Nginx 閰嶇疆鍙傝€冿紙1Panel 缃戠珯閰嶇疆杈呭姪锛?```

## 4. 鍗＄偣涓庤В鍐虫柟妗?
### 4.1 .gitignore 淇敼锛堝繀椤伙級

褰撳墠 `.gitignore` 涓?`build` 琚拷鐣ワ紝浣?Strapi 5 闇€瑕?`build/`锛坅dmin panel 闈欐€佹枃浠讹級鎵嶈兘鍚姩銆?
**鏈湴淇敼 `.gitignore`锛?*

```diff
 # Strapi
 .env
 license.txt
 exports
 .strapi
-build
+!build/
 .strapi-updater.json
 .strapi-cloud.json
```

**娉ㄦ剰**锛氬彧鏀?`basic` 浠撳簱鐨?`.gitignore`锛屼笉褰卞搷鍏朵粬 repo銆傛敼瀹屽悗鍔″繀閲嶆柊 `npm run build` 鐢熸垚 `build/` 骞舵彁浜ゃ€?
### 4.2 鎻掍欢 dist 蹇呴』鍦ㄦ湰鍦版瀯寤?
`strapi build`锛堝嵆 `npm run build`锛変緷璧栦簬鎵€鏈夋彃浠跺凡鏋勫缓濂?`dist/`銆侱ockerfile 涓娇鐢ㄧ殑鏄細
```
for plugin in plugins/zhao-*/; do
  npx -y @strapi/sdk-plugin build
done
npm run build
```

**鏈湴棣栨鏋勫缓蹇呴』鎵ц鍚屾牱姝ラ**銆傝瑙佺 7 鑺傘€?
### 4.3 Vendure entry point 寰呯‘璁?
PM2 閰嶇疆涓殑 `script` 瀛楁闇€瑕佺煡閬?Vendure 鐨勫叆鍙ｆ枃浠躲€傞€氬父涓?`dist/index.js` 鎴?`dist/server.js`銆傛湇鍔″櫒瀹夎鏃堕渶瑕佸厛妫€鏌ュ啀璁剧疆銆?
### 4.4 public/uploads 鎸佷箙鍖?
`public/uploads/` 鍦?`.gitignore` 涓紙`public/uploads/*`锛夛紝鏈嶅姟鍣ㄤ笂 git clone 鍚庝笉浼氳嚜鍔ㄥ垱寤恒€傚畨瑁呰剼鏈渶瑕佹墜鍔ㄥ垱寤烘鐩綍骞惰缃潈闄愩€?
### 4.5 鏈嶅姟鍣?SSH 瀵嗛挜

`git@github.com:johocn/` 涓嬬殑浠撳簱鍧囦负绉佹湁锛屾湇鍔″櫒闇€瑕佹湁 GitHub SSH 瀵嗛挜鎵嶈兘 clone銆?
## 5. 鍐呭瓨鍒嗛厤鏂规

### 5.1 鍐呭瓨棰勭畻

| 鏈嶅姟 | 绫诲瀷 | 鍐呭瓨鍗犵敤 | 璇存槑 |
|------|------|---------|------|
| PostgreSQL | Docker | ~250MB | 1Panel 宸插畨瑁咃紝shared_buffers=256MB |
| Redis | Docker | ~50MB | 1Panel 宸插畨瑁咃紝maxmemory=128MB |
| Strapi 5 | PM2 | ~500MB | `--max-old-space-size=800` |
| Vendure | PM2 | ~400MB | `--max-old-space-size=600` |
| PM2 daemon + OS | 绯荤粺 | ~200MB | 鍐呮牳缂撳瓨 + pm2 瀹堟姢杩涚▼ |
| **鎬昏** | | **~1.4GB** | 鍓╀綑 ~600MB 浣欓噺 |

### 5.2 Strapi 浼樺寲

1. **鏁版嵁搴撹繛鎺ユ睜**锛歚config/database.ts` 鏀逛负 `pool: { min: 1, max: 5 }`锛堝師 min:2, max:10锛?2. **Redis 缂撳瓨**锛氶€氳繃 `zhao-channel` 閰嶇疆 `REDIS_HOST=127.0.0.1`锛屽噺灏戞暟鎹簱鏌ヨ
3. **绂佺敤闈炲繀闇€鎻掍欢**锛氬彲鍦?`config/plugins.ts` 涓敞閲婃帀 `@strapi/plugin-cloud`锛堜粎涓?Strapi Cloud 鐩稿叧锛?
### 5.3 PM2 閰嶇疆

```js
// /opt/joho/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'strapi',
      cwd: '/opt/joho/strapi',
      script: 'dist/src/index.js',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=800',
        HOST: '127.0.0.1',
        PORT: 1337,
      },
      env_file: '/opt/joho/strapi.env',
      max_memory_restart: '850M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '/var/log/joho/strapi-error.log',
      out_file: '/var/log/joho/strapi-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'vendure',
      cwd: '/opt/joho/vendure',
      script: 'dist/index.js',   // TODO: 鏈嶅姟鍣ㄥ畨瑁呮椂纭 Vendure 瀹為檯鍏ュ彛
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=600',
        HOST: '127.0.0.1',
        PORT: 3000,
      },
      env_file: '/opt/joho/vendure.env',
      max_memory_restart: '650M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '/var/log/joho/vendure-error.log',
      out_file: '/var/log/joho/vendure-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

## 6. 鍩熷悕涓?Nginx 閰嶇疆

### 6.1 瀛愬煙鍚嶈鍒?
| 鍩熷悕 | 鍚庣鐩戝惉 | 鎸囧悜鐩綍 | 澶囨敞 |
|------|---------|---------|------|
| `api.joho.cn` | Strapi 127.0.0.1:1337 | 鈥?| 鍚庣 API + admin |
| `shop-api.joho.cn` | Vendure 127.0.0.1:3000 | 鈥?| 鐢靛晢鍚庣 API |
| `shop.joho.cn` | 鈥?| `/opt/joho/shop/dist/` | 鍥藉唴鐢靛晢鍓嶇 |
| `cross.joho.cn` | 鈥?| `/opt/joho/vshop/dist/` | 璺ㄥ鐢靛晢鍓嶇 |
| `course.joho.cn` | 鈥?| `/opt/joho/site/dist/` | 璇剧▼绠＄悊鍓嶇 |
| `www.joho.cn` | 鈥?| `/opt/joho/dsite/dist/` | 澶氱鎴峰畼缃?|

### 6.2 1Panel 閰嶇疆姝ラ

4 涓墠绔珯鐐圭洿鎺ュ湪 1Panel 闈㈡澘鎿嶄綔锛?
1. **缃戠珯 鈫?鍒涘缓缃戠珯** 鈫?閫夋嫨 "鍙嶅悜浠ｇ悊" 绫诲瀷
2. 濉啓鍩熷悕锛堝 `shop.joho.cn`锛?3. 閫夋嫨 "闈欐€佹枃浠堕儴缃? 妯″紡锛屾牴鐩綍閫夋嫨 `/opt/joho/shop/dist/`
4. 1Panel 鑷姩澶勭悊 SSL 璇佷功锛圠et's Encrypt锛? Nginx 閰嶇疆
5. 閲嶅浠ヤ笂姝ラ涓?`cross.joho.cn`銆乣course.joho.cn`銆乣www.joho.cn`

2 涓悗绔珯鐐瑰湪 1Panel 鍒涘缓锛屼絾浣滀负 "鍙嶅悜浠ｇ悊" 妯″紡锛?
1. **缃戠珯 鈫?鍒涘缓缃戠珯** 鈫?閫夋嫨 "鍙嶅悜浠ｇ悊" 绫诲瀷
2. 濉啓鍩熷悕 `api.joho.cn`锛岀洰鏍囧湴鍧€ `http://127.0.0.1:1337`
3. 濉啓鍩熷悕 `shop-api.joho.cn`锛岀洰鏍囧湴鍧€ `http://127.0.0.1:3000`
4. 1Panel 鑷姩鐢熸垚 OpenResty 閰嶇疆骞剁敵璇?SSL 璇佷功

### 6.3 Nginx 鍏抽敭鍙傛暟

```nginx
# 鍚庣浠ｇ悊閫氱敤閰嶇疆锛堝湪 1Panel 缃戠珯璁剧疆涓厤缃級
proxy_read_timeout 60s;
proxy_send_timeout 60s;
client_max_body_size 50m;
proxy_set_header X-Forwarded-Proto $scheme;
```

> **閲嶈**锛氭墍鏈?Nginx 閰嶇疆鍦?1Panel 闈㈡澘涓慨鏀癸紝涓嶈鎵嬪姩缂栬緫 `/etc/nginx/nginx.conf`銆?
## 7. 鏈湴鏋勫缓娴佺▼

### 7.1 Git 杩滅▼閰嶇疆

```bash
# 鍦?E:\code\basic 鐩綍涓嬫墽琛?cd E:\code\basic

# 娣诲姞 strapi 杩滅▼
git remote add strapi git@github.com:johocn/strapi.git

# 鏌ョ湅鎵€鏈夎繙绋?git remote -v
# strapi  git@github.com:johocn/strapi.git (fetch)
# strapi  git@github.com:johocn/strapi.git (push)
```

### 7.2 鏋勫缓鑴氭湰

鍦?`E:\code\basic` 涓嬪垱寤?`build-prod.bat`锛屼竴閿畬鎴愭墍鏈夋瀯寤猴細

```batch
@echo off
chcp 65001 > nul
echo ===== 鏋勫缓鎵€鏈夋彃浠?=====
cd /d "%~dp0"

for /d %%p in (plugins\zhao-*) do (
    if exist "%%p\package.json" (
        echo [鎻掍欢] 鏋勫缓 %%p
        cd "%%p"
        call npx -y @strapi/sdk-plugin build
        if errorlevel 1 (
            echo [璀﹀憡] %%p 鏋勫缓澶辫触锛屼娇鐢ㄩ缂栬瘧 dist
        )
        cd "%~dp0"
    )
)

echo ===== 鏋勫缓 Strapi 搴旂敤 =====
call npm run build

echo ===== 鏋勫缓瀹屾垚 =====
echo 璇风‘璁?dist/ 鍜?build/ 鐩綍宸叉洿鏂?echo git add -A . && git commit -m "build: rebuild for deploy"
echo git push strapi main
```

### 7.3 鎺ㄩ€佸懡浠?
```bash
git add -A .
git commit -m "build: rebuild for deploy"
git push strapi main
```

## 8. 鏈嶅姟鍣ㄥ畨瑁呰剼鏈璁?
### 8.1 宸ヤ綔鏂瑰紡

`install.sh` 鏀惧湪鏈嶅姟鍣?`/opt/joho/` 鐩綍銆傚崐鑷姩鎵ц锛岄渶瑕佺敤鎴峰弬涓庣殑姝ラ浼氭殏鍋滄彁绀恒€?
```
娴佺▼鍥撅細

鐢ㄦ埛涓婁紶 install.sh 鍒?/opt/joho/

Step 1: 鐜妫€鏌?  鈹溾攢 Node.js 鐗堟湰妫€鏌?(鈮?0)
  鈹溾攢 npm 鍙敤
  鈹溾攢 PM2 瀹夎 (鏈畨瑁呭垯 npm i -g pm2)
  鈹溾攢 Git 鍙敤
  鈹斺攢 Docker 杩愯涓?(PostgreSQL + Redis 宸插惎鍔?

Step 2: 鍒涘缓蹇呰鐩綍
  鈹溾攢 /opt/joho/锛堝凡鏈夛級
  鈹溾攢 /var/log/joho/锛堟棩蹇楃洰褰曪級
  鈹斺攢 /opt/joho/strapi/public/uploads/锛堜笂浼犳枃浠剁洰褰曪級

  銆愭殏鍋溿€?-> 鎻愮ず鐢ㄦ埛娣诲姞 SSH 鍏挜鍒?GitHub

Step 3: 鍏嬮殕鎵€鏈変粨搴?  鈹溾攢 git clone git@github.com:johocn/strapi.git /opt/joho/strapi
  鈹溾攢 git clone git@github.com:johocn/vendure.git /opt/joho/vendure
  鈹溾攢 git clone git@github.com:johocn/vshop.git /opt/joho/vshop
  鈹溾攢 git clone git@github.com:johocn/shop.git /opt/joho/shop
  鈹溾攢 git clone git@github.com:johocn/site.git /opt/joho/site
  鈹斺攢 git clone git@github.com:johocn/dsite.git /opt/joho/dsite
  锛堝凡瀛樺湪鍒?git pull锛?
Step 4: 瀹夎鐢熶骇渚濊禆
  鈹溾攢 cd /opt/joho/strapi && npm ci --production --ignore-scripts
  鈹斺攢 cd /opt/joho/vendure && npm ci --production --ignore-scripts

Step 5: 鐢熸垚 .env 妯℃澘
  鈹溾攢 cp /opt/joho/strapi/.env.example /opt/joho/strapi.env
  鈹斺攢 cp /opt/joho/vendure/.env.example /opt/joho/vendure.env

  銆愭殏鍋溿€?-> 鎻愮ず鐢ㄦ埛缂栬緫 .env 鏂囦欢锛?  nano /opt/joho/strapi.env    # 濉啓鏁版嵁搴撳瘑鐮併€佸瘑閽?  nano /opt/joho/vendure.env   # 濉啓鏁版嵁搴撳瘑鐮?
Step 6: PM2 鍚姩
  鈹溾攢 鐢熸垚 ecosystem.config.js
  鈹溾攢 pm2 start /opt/joho/ecosystem.config.js
  鈹斺攢 pm2 save锛堣缃紑鏈鸿嚜鍚級

Step 7: 杈撳嚭瀹夎缁撴灉
  鈹溾攢 PM2 杩涚▼鐘舵€?  鈹溾攢 鏃ュ織鏌ョ湅鍛戒护: tail -f /var/log/joho/strapi-error.log
  鈹溾攢 1Panel 鎿嶄綔鎸囧紩:
  鈹?  1. 鎵撳紑 1Panel 鈫?缃戠珯 鈫?鍒涘缓缃戠珯
  鈹?  2. 娣诲姞 api.joho.cn 鈫?鍙嶅悜浠ｇ悊 鈫?127.0.0.1:1337
  鈹?  3. 娣诲姞 shop-api.joho.cn 鈫?鍙嶅悜浠ｇ悊 鈫?127.0.0.1:3000
  鈹?  4. 娣诲姞 shop.joho.cn 鈫?闈欐€佹枃浠?鈫?/opt/joho/shop/dist/
  鈹?  5. 娣诲姞 cross.joho.cn 鈫?闈欐€佹枃浠?鈫?/opt/joho/vshop/dist/
  鈹?  6. 娣诲姞 course.joho.cn 鈫?闈欐€佹枃浠?鈫?/opt/joho/site/dist/
  鈹?  7. 娣诲姞 www.joho.cn 鈫?闈欐€佹枃浠?鈫?/opt/joho/dsite/dist/
  鈹斺攢 1Panel 鑷姩鐢宠 SSL 璇佷功
```

### 8.2 骞傜瓑璁捐

| 鎿嶄綔 | 骞傜瓑鏂瑰紡 |
|------|---------|
| 鐩綍宸插瓨鍦?| `mkdir -p` 鐩存帴璺宠繃 |
| 浠撳簱宸?clone | `git pull` 鏇存柊浠ｇ爜 |
| node_modules 宸插畨瑁?| `npm ci --production` 閿佸畾鐗堟湰锛屼笉浼氶噸澶嶄笅杞?|
| PM2 杩涚▼宸插瓨鍦?| `pm2 restart` 閲嶈浇閰嶇疆锛屼笉浼氶噸澶嶅垱寤?|
| .env 宸插瓨鍦?| **涓嶈鐩?*锛屼粎鎻愮ず鐢ㄦ埛妫€鏌?|
| 鏃ュ織鏂囦欢 | 杩藉姞妯″紡锛屼笉娓呴櫎鍘嗗彶 |

## 9. 楠屾敹鏍囧噯

1. `.gitignore` 涓?`build` 宸叉敼涓?`!build/`锛宍dist/` 鍜?`build/` 宸叉彁浜ゅ埌 `strapi` 杩滅▼
2. 鏈湴 `build-prod.bat` 鎵ц鎴愬姛锛孲trapi admin panel 鍙闂?3. 鏈嶅姟鍣?`install.sh` 鎵ц瀹屾瘯锛孭M2 鏄剧ず `strapi` 鍜?`vendure` 涓や釜杩涚▼ online
4. 4 涓墠绔粨搴撳凡 clone 鍒板搴旂洰褰?5. 1Panel 缃戠珯绠＄悊娣诲姞 6 涓珯鐐癸紝SSL 璇佷功姝ｅ父
6. 閫氳繃 `api.joho.cn/admin` 鍙墦寮€ Strapi 鍚庡彴
7. 鏈嶅姟鍣ㄩ噸鍚悗 `pm2 status` 鍜?`docker ps` 鑷姩鎭㈠
8. 纾佺洏 40G 绌洪棿锛屾棩蹇楅厤缃?logrotate 鑷姩杞浆

## 10. 涓嶅仛鐨勪簨

- 涓嶅湪鏈嶅姟鍣ㄤ笂鐢?Docker 杩愯 Strapi 鎴?Vendure锛堜粎 PM2 + Node.js锛?- 涓嶅湪鏈嶅姟鍣ㄤ笂杩愯 `npm ci` 浠ュ鐨?npm 鍛戒护锛堢粷瀵逛笉鎵ц `npm run build`锛?- 涓嶄慨鏀?`.gitignore` 浠ュ鐨勯」鐩枃浠讹紙淇濇寔涓庢湰鍦颁竴鑷达級
- 涓嶄负 4 涓墠绔粨搴撴彁渚涙瀯寤鸿剼鏈€斺€斿悇鑷嫭绔嬫瀯寤猴紝dist 閫氳繃 git pull 鎴?1Panel 涓婁紶鏇存柊
- 涓嶉厤缃?CI/CD 娴佹按绾?- 涓嶄慨鏀?`basic` 浠撳簱鐨勬湰鍦版枃浠跺す鍚嶇О锛堜繚鐣?`basic`锛夛紝浠呰繙绋嬫帹閫佸悕绉颁负 `strapi`