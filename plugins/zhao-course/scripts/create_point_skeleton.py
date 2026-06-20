import os, json

BASE = r"e:\code\plugins\zhao-point"

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  OK: {path}")

# ========== Task 1: 项目骨架 ==========
write("package.json", json.dumps({
    "name": "zhao-point",
    "version": "0.0.0",
    "description": "积分管理插件 - 记录营销活动积分、增减变动、兑换礼品",
    "keywords": ["strapi", "plugin", "points", "积分"],
    "type": "commonjs",
    "exports": {
        "./package.json": "./package.json",
        "./strapi-server": {
            "types": "./dist/server/src/index.d.ts",
            "source": "./server/src/index.ts",
            "require": "./dist/server/src/index.js",
            "default": "./dist/server/src/index.js"
        }
    },
    "scripts": {
        "build": "cd server && npm run build",
        "develop": "cd server && npm run develop",
        "clean": "cd server && npm run clean"
    },
    "devDependencies": {
        "@strapi/strapi": "^5.45.0",
        "@strapi/typescript-utils": "^5.45.0",
        "typescript": "^5.9.3"
    },
    "strapi": {
        "kind": "plugin",
        "name": "zhao-point",
        "displayName": "积分管理",
        "description": "记录营销活动积分、增减变动、兑换礼品"
    }
}, ensure_ascii=False, indent=2))

write("strapi-server.js", "module.exports = require('./dist/server/src/index.js');\n")

write("server/tsconfig.json", json.dumps({
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "types": [],
        "outDir": "dist",
        "rootDir": "src",
        "strict": false,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true
    },
    "include": ["./src"],
    "exclude": ["node_modules", "dist", "test"]
}, indent=2))

write("server/package.json", json.dumps({
    "name": "zhao-point-server",
    "version": "0.0.0",
    "private": true,
    "scripts": {
        "build": "tsc",
        "develop": "tsc --watch",
        "clean": "rimraf dist"
    },
    "devDependencies": {
        "@strapi/strapi": "^5.45.0",
        "@strapi/typescript-utils": "^5.45.0",
        "typescript": "^5.9.3"
    }
}, indent=2))

print("=== 骨架文件创建完成 ===")
