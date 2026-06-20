# 创建 zhao-quiz tsconfig + schema + server 核心文件
$root = "e:\code\plugins\zhao-quiz"

# ── tsconfig ──
@"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist/server",
    "rootDir": "./server/src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./server/src/*"] }
  },
  "include": ["server/src/**/*.ts"],
  "exclude": ["node_modules", "dist", "admin"]
}
"@ | Set-Content -Path "$root\tsconfig.server.json" -Encoding UTF8

@"
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "outDir": "./dist/admin",
    "rootDir": "./admin/src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["admin/src/**/*.ts", "admin/src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "server"]
}
"@ | Set-Content -Path "$root\tsconfig.admin.json" -Encoding UTF8

@"
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./server/src",
    "baseUrl": ".",
    "paths": { "@/*": ["./server/src/*"] }
  },
  "include": ["server/src/**/*.ts"],
  "exclude": ["node_modules", "dist", "admin"]
}
"@ | Set-Content -Path "$root\tsconfig.json" -Encoding UTF8

Write-Host "tsconfig files created"
