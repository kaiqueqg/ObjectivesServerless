import { LogLevel } from "./types";
import { performance } from 'perf_hooks';

const currentLogLevel = LogLevel.Dev;
let t1 = performance.now();
let t2 = performance.now();
const startT = t1;

export interface ILogger {
  d: (...texts: any[]) => void;
  dend: (...texts: any[]) => void;
  war: (...texts: any[]) => void;
  err: (...texts: any[]) => void;
}

const log: ILogger = {
  d(...texts: any[]) {
    if (currentLogLevel <= LogLevel.Dev) {
      t2 = performance.now();
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
      console.log(`[DEV] ${((t2 - t1)/1000).toFixed(3)}s`, ...formattedTexts);
      t1 = t2;
    }
  },
  dend(...texts: any[]) {
    if (currentLogLevel <= LogLevel.Dev) {
      t2 = performance.now();
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
      console.log(`[DEV] f-${((performance.now() - startT)/1000).toFixed(3)}s`, ...formattedTexts);
      t1 = t2;
    }
  },
  war(...texts: any[]){
    if (currentLogLevel <= LogLevel.Warn) {
      t2 = performance.now();
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
  
      console.log(`[WAR] ${((t2 - t1)/1000).toFixed(3)}s -> `, ...formattedTexts);
      t1 = t2;
    }
  },
  err(...texts: any[]){
    if (currentLogLevel <= LogLevel.Error) {
      t2 = performance.now();
      const formattedTexts = texts.map(text => {
        if (text !== null && typeof text === 'object' && !Array.isArray(text)) {
          return JSON.stringify(text, null, 2); //if object, prettyfy
        } else {
          return text;
        }
      });
  
      console.log(`[ERR] ${((t2 - t1)/1000).toFixed(3)}s -> `, ...formattedTexts);
      t1 = t2;
    }
  },
}

export default log;
