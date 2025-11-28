import { GetItemOutput, QueryOutput } from "aws-sdk/clients/dynamodb";
import log from "./log";
import { checkItem, checkObjective, Codes, DefaultDivider, DefaultExercise, DefaultGrocery, DefaultHouse, DefaultImage, DefaultItem, DefaultLink, DefaultLocation, DefaultMedicine, DefaultNote, DefaultObjective, DefaultQuestion, DefaultResponse, DefaultStep, DefaultWait, DeviceData, InternalServerError, isItemIDValid, isObjectiveIDValid, isUserIdObjectiveIDValid, isUserIDValid, Item, ItemType, Objective, ObjectivesList, Response, Service, StepImportance } from "./types";
import { MAX_ITEMS_PER_REQUEST, MAX_OBJECTIVES_PER_REQUEST } from './index'

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const objectivesTableName = process.env.DB_TABLE_OBJECTIVES??'';
const itemsTableName = process.env.DB_TABLE_OBJECTIVE_ITEMS??'';
const servicesTableName = process.env.DB_TABLE_SERVICES??'';

//temp
const deviceTableName = process.env.DB_TABLE_DEVICE;

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

  //! pagination
  ///type ID - length ID - injection
  async queryObjectiveList(userId: string): Promise<QueryOutput> {
    if (!isUserIDValid(userId)) {
      throw new Error('Invalid userId');
    }
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: objectivesTableName,
      KeyConditionExpression: "UserId = :UserId",
      ExpressionAttributeValues: {
        ":UserId": userId,
      },
      Limit: 200,
    };

    return await dynamoDB.query(params).promise();
  },
  //! pagination
  ///type ID - length ID - injection
  async queryObjectiveItemList(userIdObjectiveId: string): Promise<QueryOutput> {
    log.d('queryObjectiveItemList - start - ', userIdObjectiveId)
    if (!isUserIdObjectiveIDValid(userIdObjectiveId)) {
      log.d('queryObjectiveItemList - err - Invalid userIdObjectiveId')
      throw new Error('Invalid userIdObjectiveId');
    }
  
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: itemsTableName??'',
      KeyConditionExpression: 'UserIdObjectiveId = :UserIdObjectiveId',
      ExpressionAttributeValues: {
          ':UserIdObjectiveId': userIdObjectiveId
      },
      Limit: 200,
    };
    const rtn = await dynamoDB.query(params).promise();
    log.d('queryObjectiveItemList - rtn - ', rtn)
    return rtn;
  },

  //! pagination
  ///type ID - length ID - injection
  async getObjectiveList(userId: string): Promise<Objective[]|null>{
    const result = await this.queryObjectiveList(userId);

    if(result.Items){
      const objs = result.Items as unknown as  Objective[];
      const newObjs = objs.map(obj => checkObjective(obj));
      return newObjs;
    }

    return null;
  },
  //! pagination
  ///type ID - length ID - injection
  async getObjectiveItemList(userIdObjectiveId: string): Promise<Item[]|null>{
    const result = await this.queryObjectiveItemList(userIdObjectiveId);

    if(result.Items){
      const items = result.Items as unknown as Item[];
      const newItems = items.map(i => checkItem(i));
      return newItems;
    }

    return null;
  },
  //! pagination
  ///type ID - length ID - injection
  async getObjective(userId: string, objectiveId: string): Promise<Objective|null>{
    if (!isUserIDValid(userId) || !isObjectiveIDValid(objectiveId)) return null;

    const params:AWS.DynamoDB.DocumentClient.GetItemInput ={
      TableName: objectivesTableName,
      Key:{ UserId: userId, ObjectiveId: objectiveId },
    }

    const result:GetItemOutput = await dynamoDB.get(params).promise();
    if(result.Item){
      return checkObjective(result.Item as unknown as Objective);
    }
    
    return null;
  },
  
  //! pagination
  ///type ID - length ID - array length - injection
  async putObjectives(userId: string, objectives: Objective[]): Promise<boolean>{
    if (!isObjectiveIDValid(userId)) return false;

    if(objectives.length > MAX_OBJECTIVES_PER_REQUEST) 
      return false;

    for (let i = 0; i < objectives.length; i++) {
      const obj = objectives[i];

      /// Make sure the correct userId
      obj.UserId = userId; 
      if(obj.ObjectiveId === "") obj.ObjectiveId = generateId();
      else if(!isObjectiveIDValid(obj.ObjectiveId)) return false;
      
      const newObj:Objective = checkObjective(obj);

      const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
        TableName: objectivesTableName,
        Item: { ...newObj }
      }
      await dynamoDB.put(params).promise();
    }
    
    return true;
  },

  //! pagination - objectives IDs
  ///type ID - length ID - array length - injection
  async deleteObjectives(userId: string, objectives: Objective[]): Promise<Objective[]|null>{
    if (!isObjectiveIDValid(userId)) return null;
    if(objectives.length > MAX_OBJECTIVES_PER_REQUEST) return null;

    for (let i = 0; i < objectives.length; i++) {
      const objective = objectives[i];
      
      /// First delete all Items of this Objective
      const result = await this.queryObjectiveItemList(userId+objective.ObjectiveId);
      const items = (result.Items ?? []) as unknown as Item[];
      if(result.Items && result.Items.length > 0){
        await this.deleteObjectiveItems(userId, items);
      }

      ///Now delete Objective
      const params: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: objectivesTableName,
        Key: { UserId: userId, ObjectiveId: objective.ObjectiveId }
      };

      await dynamoDB.delete(params).promise();
    }
    
    return objectives;
  },

  //! pagination
  ///type ID - length ID - array length - injection
  async getObjectiveItem(userIdObjectiveId: string, itemId: string): Promise<Item|null>{
    if (!isUserIdObjectiveIDValid(userIdObjectiveId)) return null;
    if (!isItemIDValid(itemId)) return null;

    const params:AWS.DynamoDB.DocumentClient.GetItemInput ={
      TableName: itemsTableName,
      Key:{ UserIdObjectiveId: userIdObjectiveId, ItemId: itemId }
    }

    const result = await dynamoDB.get(params).promise();

    if(result.Item){
      return checkItem(result.Item);
    }

    return null;
  },

  //! pagination - each Item IDs
  ///type ID - length ID - array length - injection
  async putObjectiveItems(userId: string, items: Item[]): Promise<boolean>{ // TODO needs treatment for partial put
    if (!isUserIDValid(userId)) return false;
    log.d('db.putObjectiveItems - ', userId, items);

    if(items.length > MAX_ITEMS_PER_REQUEST) {
      return false;
    }
    log.d('db.putObjectiveItems - start', userId, items);

    for (let i = 0; i < items.length; i++) {
      /// Garanties that it's the userId verified by JWT and got from Database and replaced on UserIdObjectiveId with only the ObjectiveId provided by the body.
      items[i].UserIdObjectiveId = userId + ((items[i].UserIdObjectiveId.length > 40) ? items[i].UserIdObjectiveId.slice(-40) : items[i].UserIdObjectiveId);

      if(items[i].ItemId === "") items[i].ItemId = generateId();

      const newItem:Item = checkItem(items[i]);

      const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
        TableName: itemsTableName,
        Item: { ...newItem }
      }
      await dynamoDB.put(params).promise();
    }

    log.d('db.putObjectiveItems - end');
    
    return true;
  },

  //! pagination - eah Item IDs
  ///type ID - length ID - array length - injection
  async deleteObjectiveItems(userId:string, items: Item[]): Promise<Item[]|null>{ // TODO needs treatment for partial delete
    if (!isUserIDValid(userId)) return null;
    if(items.length > MAX_ITEMS_PER_REQUEST) return null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      item.UserIdObjectiveId = userId + ((item.UserIdObjectiveId.length > 40) ? item.UserIdObjectiveId.slice(-40) : item.UserIdObjectiveId);

      const params: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: itemsTableName,
        Key: { UserIdObjectiveId: item.UserIdObjectiveId, ItemId: item.ItemId }
      };
      await dynamoDB.delete(params).promise();
    }

    return items;
  },

  //! pagination - eah Item IDs - array length
  ///type ID - length ID - injection
  async syncObjectivesList(userId: string, objectivesList: ObjectivesList, isGuest: boolean): Promise<ObjectivesList|null> {
    if (!isUserIDValid(userId)) return null;

    log.d('db.syncObjectivesList - start');
    try {
      //! GET DB ITEMS FOR LATER
      let dbItems: Item[] = [];
      let dbObjectives: Objective[] = [];
      const result: QueryOutput = await this.queryObjectiveList(userId);
      log.d('db.syncObjectivesList - result - ', result);
      if(result.Items) {
        dbObjectives = result.Items as unknown as Objective[];
        for(let i = 0; i < dbObjectives.length; i++){
          const rtnItemList: QueryOutput = await this.queryObjectiveItemList(userId + dbObjectives[i].ObjectiveId);
          log.d('db.syncObjectivesList - rtnItemList - ', rtnItemList); 
          
          if(rtnItemList.Items){
            dbItems.push(...(rtnItemList.Items as unknown as Item[]));
          }
        }
      }


      //! DELETE OBJECTIVES
      if (objectivesList.DeleteObjectives?.length && !isGuest) {
        const deletedObjectives = objectivesList.DeleteObjectives.filter(
          o => o && o.ObjectiveId
        );

        await Promise.all(
          deletedObjectives.map(o => this.deleteObjectives(userId, [o]))
        );

      }
      log.d('db.syncObjectivesList - delete obj');

      //! DELETE ITEMS
      if (objectivesList.DeleteItems?.length && !isGuest) {
        const deletedItems = objectivesList.DeleteItems.filter(
          i => i && i.UserIdObjectiveId && i.ItemId
        );

        await Promise.all(
          deletedItems.map(i => this.deleteObjectiveItems(userId, [i]))
        );
      }

      log.d('db.syncObjectivesList - delete items');

      //! PUT ITEMS
      if (objectivesList.Items?.length) {
        const items = objectivesList.Items;

        await Promise.all(
          items.map(async item => {
            if (!item || !item.UserIdObjectiveId || !item.ItemId) return;

            const equalIt = dbItems.find(
              it => it.UserIdObjectiveId === item.UserIdObjectiveId && it.ItemId === item.ItemId
            );

            if (equalIt?.LastModified && item.LastModified) {
              const dbDate = new Date(equalIt.LastModified);
              const syncDate = new Date(item.LastModified);

              if (!isNaN(dbDate.getTime()) && !isNaN(syncDate.getTime()) && dbDate < syncDate) {
                await this.putObjectiveItems(userId, [item]);
              }
            } else {
              await this.putObjectiveItems(userId, [item]);
            }
          })
        );
      }

      log.d('db.syncObjectivesList - putItems - ', objectivesList.Items);

      //! PUT OBJECTIVES
      if (objectivesList.Objectives?.length) {
        const objectives = objectivesList.Objectives;

        await Promise.all(
          objectives.map(async objective => {
            if (!objective || !objective.ObjectiveId) return;

            const equalObj = dbObjectives.find(
              o => o.ObjectiveId === objective.ObjectiveId
            );

            if (equalObj?.LastModified && objective.LastModified) {
              const dbDate = new Date(equalObj.LastModified);
              const syncDate = new Date(objective.LastModified);

              if (
                !isNaN(dbDate.getTime()) &&
                !isNaN(syncDate.getTime()) &&
                dbDate < syncDate
              ) {
                await this.putObjectives(userId, [objective]);
              }
            } else {
              await this.putObjectives(userId, [objective]);
            }
          })
        );
      }

      log.d('db.syncObjectivesList - objectivesList.Objectives - ', objectivesList.Objectives);

      /// Getting the final objective and item list
      const queryObjectives: QueryOutput = await this.queryObjectiveList(userId);
      log.d('db.syncObjectivesList - queryObjectives - ', queryObjectives);
      if(!queryObjectives.Items){
        return null
      }


      let newObjectives: Objective[] = queryObjectives.Items as unknown as Objective[];
      let newItems: Item[] = []
      for(let i = 0; i < newObjectives.length; i++){
        const queryItems: QueryOutput = await this.queryObjectiveItemList(userId + newObjectives[i].ObjectiveId);
      log.d('db.syncObjectivesList - queryItems - ', queryItems);
        if(!queryItems.Items)
          return null;

        newItems.push(...(queryItems.Items as unknown as Item[]));
      }
      
      const rtnObjectiveList: ObjectivesList = {Objectives: newObjectives, Items: newItems}
      log.d('db.syncObjectivesList - rtnObjectiveList - ', rtnObjectiveList);
      return rtnObjectiveList;
    } catch (err) {
      log.err('db.syncObjectivesList', 'err', err);
      return null;
    }
  },

  async getService(): Promise<Service|null> {
    const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
      TableName: servicesTableName,
      Key: { Name: 'GroceryListServerless' },
    };

    const result = await dynamoDB.get(params).promise();
    if (result.Item) {
      const dbService: Service = result.Item as Service;
      return dbService;
    }

    return null;
  },

  async getDeviceData(userId: string){
    // try {
    //   const params = {
    //     TableName: deviceTableName,
    //     KeyConditionExpression: "UserId = :UserId",
    //     ExpressionAttributeValues: {
    //       ":UserId": userId,
    //     },
    //   };
    //   let res: Response<DeviceData[]>;
    //   const result = await dynamoDB.query(params).promise();

    //   if(result.Items && result.Items.length > 0){
    //     res = { WasAnError: false, Data: result.Items, Code: Codes.OK, }
    //   }
    //   else{
    //     res = { WasAnError: false, Data: [], Code: Codes.NoContent, }
    //   }
    //   return res;
    // } catch (err) {
    //   log.err('getDeviceData', 'err', err);
    //   const response: Response<DeviceData[]> = {
    //     WasAnError: true,
    //     Message: 'Problem trying to get device data from database.',
    //     Exception: JSON.stringify(err),
    //     Code: Codes.InternalServerError
    //   };
    //   return response;
    // }
  },
  
  async postDeviceData(deviceData: DeviceData[]){
    // try {
    //   let now = new Date();
    //   now.setHours(now.getHours() - 3);
    //   for (let i = 0; i < deviceData.length; i++) {
    //     deviceData[i].DataId = generateId();
    //     deviceData[i].DateAdded = now.toISOString();
    //   }

    //   for (let i = 0; i < deviceData.length; i++) {
    //     const params = {
    //       TableName: deviceTableName,
    //       Item: { ...deviceData[i] }
    //     }
    //     await dynamoDB.put(params).promise();
    //   }

    //   return "200";
    // } catch (err) {
    //   log.err('postDeviceData', 'err', err);
    //   return "500";
    // }
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