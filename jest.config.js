module.exports = {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".(spec|test).ts$",
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "collectCoverage": true,
  "coverageDirectory": "../coverage/",
  "testEnvironment": "node",
  "globals": {
    "ts-jest": {
      "packageJson": "package.json"
    }
  }
}
