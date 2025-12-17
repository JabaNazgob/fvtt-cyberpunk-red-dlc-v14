install:
  npm ci

clean:
  npx gulp cleanBuildDir

build: clean
  npx gulp build

watch: clean build
  npx gulp watch

extractPacks:
  npx gulp extractPacks

generateEnvFile:
  npx gulp generateEnvFile
