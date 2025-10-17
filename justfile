install:
  npm ci

clean:
  npx gulp cleanBuildDir

build:
  npx gulp build

extractPacks:
  npx gulp extractPacks

generateEnvFile:
  npx gulp generateEnvFile
