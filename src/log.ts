import { LogLevel } from "./types";

const currentLogLevel = LogLevel.Dev;

const log = {
  d(...texts: any[]) {
    if (currentLogLevel <= LogLevel.Dev) {
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
      console.log(`[DEV]`, ...formattedTexts);
    }
  },
  war(...texts: any[]){
    if (currentLogLevel <= LogLevel.Warn) {
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
  
      console.log(`[WAR]`, ...formattedTexts);
    }
  },
  err(...texts: any[]){
    if (currentLogLevel <= LogLevel.Error) {
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
  
      console.log(`[ERR]`, ...formattedTexts);
    }
  },
}

export default log;
