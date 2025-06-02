import log from "./log";
import { Codes, DeviceData, Item, Objective, ObjectiveList, Response, Services } from "./types";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const objectivesTableName = 'Objectives';
const itemsTableName = 'ObjectiveItems';
const servicesTableName = 'Services';

//temp
const deviceTableName = 'DeviceData';

const db = {
  isEqual<T extends object>(item1: T, item2: T): boolean {
    const keys = Object.keys(item1) as Array<keyof T>;
  
    for (const key of keys) {
      if (item1[key] !== item2[key]) {
        return false;
      }
    }
  
    return true;
  },

  async getObjectiveList(userId: string): Promise<Response<Objective[]>>{
    try {
      const params = {
        TableName: objectivesTableName,
        KeyConditionExpression: "UserId = :UserId",
        ExpressionAttributeValues: {
          ":UserId": userId,
        },
      };

      let res: Response<Objective[]>;
      const result = await dynamoDB.query(params).promise();
  
      const newObjs:Objective[] = [];

      for (let i = 0; i < result.Items.length; i++) {
        const element = {
          ...result.Items[i], 
          IsShowing: result.Items[i].IsShowing?? false, 
          Tags: result.Items[i].Tags?? []
        };
        
        newObjs.push(element)
      }

      if(result.Items){
        res = { WasAnError: false, Data: newObjs, Code: Codes.OK, }
      }
      else{
        res = { WasAnError: false, Code: Codes.NotFound }
      }
  
      return res;
    } catch (err) {
      log.err('getObjectiveList','err', err);
      const response: Response<Objective[]> = {
        WasAnError: true,
        Message: 'Problem trying to get objective list from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async getObjectiveItemList(userIdObjectiveId: string): Promise<Response<Item[]>>{
    try {
      const params = {
        TableName: itemsTableName,
        KeyConditionExpression: 'UserIdObjectiveId = :UserIdObjectiveId',
        ExpressionAttributeValues: {
            ':UserIdObjectiveId': userIdObjectiveId
        }
      };
      let res: Response<Item[]>;
      const result = await dynamoDB.query(params).promise();

      if(result.Items && result.Items.length > 0){
        res = { WasAnError: false, Data: result.Items, Code: Codes.OK, }
      }
      else{
        res = { WasAnError: false, Data: [], Code: Codes.NoContent, }
      }
      
      return res;
    } catch (err) {
      log.err('getObjectiveItemList', 'err', err);
      const response: Response<Item[]> = {
        WasAnError: true,
        Message: 'Problem trying to get item list from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async getObjective(userId: string, objectiveId: string): Promise<Response<Objective>>{
    try {
      const params ={
        TableName: objectivesTableName,
        Key:{ UserId: userId, ObjectiveId: objectiveId }
      }
  
      let res: Response<Objective>;
      const result = await dynamoDB.get(params).promise();
  
      if(result.Item){
        res = { WasAnError: false, Data: {...result.Item, IsShowing: result.Item.IsShowing?? false, Tags: result.Item.Tags?? []}, Code: Codes.OK, }
      }
      else{
        res = { WasAnError: false, Code: Codes.NotFound, }
      }
  
      return res;
    } catch (err) {
      log.err('getObjective', 'err', err);
      const response: Response<Objective> = {
        WasAnError: true,
        Message: 'Problem trying to get objective from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async putObjective(userId: string, objective: Objective): Promise<Response<Objective>>{
    try {
      let res: Response<Objective>;
      objective.UserId = userId; //making sure that userId is present
      if(objective.ObjectiveId === "") objective.ObjectiveId = generateId();
      
      const params = {
        TableName: objectivesTableName,
        Item: { ...objective }
      }
      await dynamoDB.put(params).promise();
      res = {
        WasAnError: false,
        Data: objective,
        Code: Codes.OK,
      }
      return res;
    } catch (err) {
      log.err('putObjective', 'err', err);
      const response: Response<Objective> = {
        WasAnError: true,
        Message: 'Problem trying to put objective from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async putObjectives(userId: string, objectives: Objective[]): Promise<Response<Objective[]>>{
    try {
      let res: Response<Objective[]>;
      let resData: Objective[] = [];
      try {
        for (let i = 0; i < objectives.length; i++) {
          
          objectives[i].UserId = userId; //making sure that userId is present
          if(objectives[i].ObjectiveId === "") objectives[i].ObjectiveId = generateId();
          
          const params = {
            TableName: objectivesTableName,
            Item: { ...objectives[i] }
          }
          await dynamoDB.put(params).promise();
          resData.push(objectives[i]);
        }
      } catch (err) {}
      
      res = {
        WasAnError: false,
        Data: resData,
        Code: Codes.OK,
      }
      return res;
    } catch (err) {
      log.err('putObjective', 'err', err);
      const response: Response<Objective[]> = {
        WasAnError: true,
        Message: 'Problem trying to put objectives from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async deleteObjective(userId: string, objective: Objective): Promise<Response<Objective>>{
    try {
      const respItems = await this.getObjectiveItemList(userId+objective.ObjectiveId);
      if(!respItems.WasAnError && respItems.Data){
        for(let i = 0 ; i < respItems.Data.length; i++){
          const item = respItems.Data[i];
          if(item.ItemId) {
            await this.deleteObjectiveItem(userId, respItems.Data[i]);
          }
        }
      }

      const params = {
        TableName: objectivesTableName,
        Key: { UserId: userId, ObjectiveId: objective.ObjectiveId }
      };
  
      await dynamoDB.delete(params).promise();
  
      return {
        WasAnError: false,
        Code: Codes.OK,
      };
    } catch (err) {
      log.err('deleteObjective', 'err', err);
      return {
        WasAnError: true,
        Message: 'Problem trying to delete objective from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
    }
  },
  async getObjectiveItem(userIdObjectiveId: string, itemId: string): Promise<Response<Item>>{
    try {
      const params ={
        TableName: itemsTableName,
        Key:{ UserIdObjectiveId: userIdObjectiveId, ItemId: itemId }
      }
  
      let res: Response<Item>;
      const result = await dynamoDB.get(params).promise();
  
      if(result.Item){
        res = { WasAnError: false, Data: result.Item, Code: Codes.OK, }
      }
      else{
        res = { WasAnError: false, Code: Codes.NotFound, }
      }
  
      return res;
    } catch (err) {
      log.err('getItem', 'err', err);
      const response: Response<Item> = {
        WasAnError: true,
        Message: 'Problem trying to get item from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async putObjectiveItem(userId: string, item: Item): Promise<Response<Item>>{
    try {
      let res: Response<Item>;
      item.UserIdObjectiveId = userId + ((item.UserIdObjectiveId.length > 40) ? item.UserIdObjectiveId.slice(-40) : item.UserIdObjectiveId);

      if(item.ItemId === "") item.ItemId = generateId();

      const params = {
        TableName: itemsTableName,
        Item: { ...item }
      }
      await dynamoDB.put(params).promise();
  
      res = {
        WasAnError: false,
        Data: item,
        Code: Codes.OK,
      }
      return res;
    } catch (err) {
      log.err('putItem', 'err', err);
      const response: Response<Item> = {
        WasAnError: true,
        Message: 'Problem trying to put item from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async putObjectiveItems(userId: string, items: Item[]): Promise<Response<Item[]>>{
    try {
      let res: Response<Item[]>;
      let resData: Item[] = [];
      try {
        for (let i = 0; i < items.length; i++) {
          items[i].UserIdObjectiveId = userId + ((items[i].UserIdObjectiveId.length > 40) ? items[i].UserIdObjectiveId.slice(-40) : items[i].UserIdObjectiveId);
    
          if(items[i].ItemId === "") items[i].ItemId = generateId();
    
          const params = {
            TableName: itemsTableName,
            Item: { ...items[i] }
          }
          await dynamoDB.put(params).promise();
          resData.push(items[i]);
        }
      } catch (err) {}
      
      res = {
        WasAnError: false,
        Data: items,
        Code: Codes.OK,
      }

      return res;
    } catch (err) {
      log.err('putItem', 'err', err);
      const response: Response<Item[]> = {
        WasAnError: true,
        Message: 'Problem trying to put item from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async deleteObjectiveItem(userId:string, item: Item): Promise<Response<Item>>{
    try {
      item.UserIdObjectiveId = userId + ((item.UserIdObjectiveId.length > 40) ? item.UserIdObjectiveId.slice(-40) : item.UserIdObjectiveId);
      const params = {
        TableName: itemsTableName,
        Key: { UserIdObjectiveId: item.UserIdObjectiveId, ItemId: item.ItemId }
      };
      await dynamoDB.delete(params).promise();
      return {
        WasAnError: false,
        Code: Codes.OK,
      };
    } catch (err) {
      log.err('deleteItem', 'err', err);
      return {
        WasAnError: true,
        Message: 'Problem trying to delete item from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
    }
  },
  async syncObjectivesList(userId: string, objectivesList: ObjectiveList): Promise<Response<ObjectiveList>> {
    try {
      const dbObjectivesList: Response<Objective[]> = await this.getObjectiveList(userId);
      if(dbObjectivesList.WasAnError || !dbObjectivesList.Data) return { WasAnError: true, Code: dbObjectivesList.Code?? Codes.InternalServerError, Message: dbObjectivesList.Message?? 'Problem trying to get objectives list from database.'};
      log.d('db - got obj list');

      let dbObjectives: Objective[] = dbObjectivesList.Data;
      let dbItems: Item[] = []
      for(let i = 0; i < dbObjectivesList.Data.length; i++){
        const rtnItemList: Response<Item[]> = await this.getObjectiveItemList(userId + dbObjectivesList.Data[i].ObjectiveId);
        if(rtnItemList.WasAnError || !rtnItemList.Data) return { WasAnError: true, Code: rtnItemList.Code?? Codes.InternalServerError, Message: rtnItemList.Message?? 'Problem trying to get item list from database.'};

        dbItems.push(...rtnItemList.Data);
      }
      log.d('db - adding items to dbItems');

      //! DELETE OBJECTIVES
      if(objectivesList.DeleteObjectives) {
        const deletedObjectives = objectivesList.DeleteObjectives;
        for(let i = 0; i < deletedObjectives.length; i++){
          const deleteObjective = deletedObjectives[i];
          if(deleteObjective.ObjectiveId && deleteObjective){
            await this.deleteObjective(userId, deleteObjective);
          }
        }
      }
      log.d('db - obj deleted');

      //! DELETE ITEMS
      if(objectivesList.DeleteItems) {
        const deletedItems = objectivesList.DeleteItems;
        for(let i = 0; i < deletedItems.length; i++){
          const deleteItem = deletedItems[i];
          if(deleteItem.UserIdObjectiveId && deleteItem.UserIdObjectiveId && deleteItem.ItemId){
            await this.deleteObjectiveItem(userId, deleteItem);
          }
        }
      }
      log.d('db - deletedItems');

      //! PUT ITEMS
      if(objectivesList.Items) {
        let items = objectivesList.Items;
        for(let i = 0; i < items.length; i++){
          const item = items[i];
          const equalIt = dbItems.find(it => it.UserIdObjectiveId === item.UserIdObjectiveId);
          
          if(equalIt && equalIt.LastModified && item.LastModified){
            const syncDate: Date = new Date(item.LastModified);
            const dbDate: Date = new Date(equalIt.LastModified);
            
            if(dbDate < syncDate) {
              await this.putObjectiveItem(userId, item);
              // log.d('Item updated', item);
            }
            else{
              // log.d('Item: ' + item + ' was denied because of date comparion. ', dbDate.toISOString(), syncDate.toISOString());
            }
          }
          else{
            await this.putObjectiveItem(userId, item);
            // log.d('else', item);
          }
        }
      }
      log.d('db - items putted');

      //! PUT OBJECTIVES
      if(objectivesList.Objectives) {
        let objectives = objectivesList.Objectives;
        for(let i = 0; i < objectives.length; i++){
          const objective = objectives[i];
          const equalCat = dbObjectives.find(cat => cat.UserId === objective.UserId);
  
          if(equalCat && equalCat.LastModified && objective.LastModified){
            const dbDate: Date = new Date(equalCat.LastModified);
            const syncDate: Date = new Date(objective.LastModified);
  
            if(dbDate < syncDate) {
              await this.putObjective(userId, objective);
            }
            else{
              // log.d('Objective: ' + objective.Title + ' was denied because of date comparion. ', dbDate.toISOString(), syncDate.toISOString());
            }
          }
          else{
            await this.putObjective(userId, objective);
          }
        }
      }
      log.d('db - objs putted');

      const newDBObjectivesList: Response<Objective[]> = await this.getObjectiveList(userId);
      if(newDBObjectivesList.WasAnError || !newDBObjectivesList.Data) return { WasAnError: true, Code: newDBObjectivesList.Code?? Codes.InternalServerError, Message: newDBObjectivesList.Message?? 'Problem trying to get objectives list from database.'};
      log.d('db - got new obj list');

      let newObjectives: Objective[] = newDBObjectivesList.Data;
      let newItems: Item[] = []
      for(let i = 0; i < newObjectives.length; i++){
        const rtnItemList: Response<Item[]> = await this.getObjectiveItemList(userId + newObjectives[i].ObjectiveId);
        if(rtnItemList.WasAnError || !rtnItemList.Data) return { WasAnError: true, Code: rtnItemList.Code?? Codes.InternalServerError, Message: rtnItemList.Message?? 'Problem trying to get item list from database.'};

        newItems.push(...rtnItemList.Data);
      }

      log.d('db - added new items to list');
      const rtnObjectiveList: ObjectiveList = {Objectives: newObjectives, Items: newItems}

      log.d('db - returning');
      return { WasAnError:false, Code: Codes.OK, Data: rtnObjectiveList };
    } catch (err) {
      log.err('db.syncObjectivesList', 'err', err);
      return {
        WasAnError: true,
        Message: 'Problem trying to SyncObjectivesList from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
    }
  },

  async getService(): Promise<Response<Services>>{
    try {
      const params ={
        TableName: servicesTableName,
        Key:{ Name: 'GroceryListServerless' }
      }
  
      let res: Response<Services>;
      const result = await dynamoDB.get(params).promise();
  
      if(result.Item){
        res = { WasAnError: false, Data: result.Item, Code: Codes.OK, }
      }
      else{
        res = { WasAnError: false, Code: Codes.NoContent}
      }
  
      return res;
    } catch (err) {
      const response: Response<Services> = {
        WasAnError: true,
        Message: 'Problem trying to get status from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },

  async getDeviceData(userId: string): Promise<Response<DeviceData[]>>{
    try {
      const params = {
        TableName: deviceTableName,
        KeyConditionExpression: "UserId = :UserId",
        ExpressionAttributeValues: {
          ":UserId": userId,
        },
      };
      let res: Response<DeviceData[]>;
      const result = await dynamoDB.query(params).promise();

      if(result.Items && result.Items.length > 0){
        res = { WasAnError: false, Data: result.Items, Code: Codes.OK, }
      }
      else{
        res = { WasAnError: false, Data: [], Code: Codes.NoContent, }
      }
      return res;
    } catch (err) {
      log.err('getDeviceData', 'err', err);
      const response: Response<DeviceData[]> = {
        WasAnError: true,
        Message: 'Problem trying to get device data from database.',
        Exception: JSON.stringify(err),
        Code: Codes.InternalServerError
      };
      return response;
    }
  },
  async postDeviceData(deviceData: DeviceData[]): Promise<string>{
    try {
      let now = new Date();
      now.setHours(now.getHours() - 3);
      for (let i = 0; i < deviceData.length; i++) {
        deviceData[i].DataId = generateId();
        deviceData[i].DateAdded = now.toISOString();
      }

      for (let i = 0; i < deviceData.length; i++) {
        const params = {
          TableName: deviceTableName,
          Item: { ...deviceData[i] }
        }
        await dynamoDB.put(params).promise();
      }

      return "200";
    } catch (err) {
      log.err('postDeviceData', 'err', err);
      return "500";
    }
  },
}

export default db;

const generateId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < 40; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}