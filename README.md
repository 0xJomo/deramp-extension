````bash
npm i
npm build
npx playwright install firefox
npm run test
cd dist
web-ext run -t firefox-android --firefox-apk org.mozilla.firefox
````
