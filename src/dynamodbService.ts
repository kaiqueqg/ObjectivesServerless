import { GetItemOutput, QueryOutput } from "aws-sdk/clients/dynamodb";
import log from "./log";
import { Codes, DefaultBadRequest, DefaultDivider, DefaultExercise, DefaultGrocery, DefaultImage, DefaultInternalServerError, DefaultItem, DefaultLink, DefaultLocation, DefaultMedicine, DefaultNoContent, DefaultNote, DefaultNotFound, DefaultObjective, DefaultOk, DefaultQuestion, DefaultResponse, DefaultStep, DefaultWait, DeviceData, Item, ItemType, Objective, ObjectiveList, Response, Services, StepImportance } from "./types";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const objectivesTableName = process.env.DB_TABLE_OBJECTIVES;
const itemsTableName = process.env.DB_TABLE_OBJECTIVE_ITEMS;
const servicesTableName = process.env.DB_TABLE_SERVICES;

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

  //^ No better solution, just check on get if missing attributes exist, if not, default 
  doObjectiveNewAttributeCheck(obj: Objective): Objective {
    const safe: Partial<Objective> = {
      UserId: obj.UserId,
      ObjectiveId: obj.ObjectiveId,
      Title: obj.Title,
      Done: obj.Done,
      Theme: obj.Theme,
      IsArchived: obj.IsArchived,
      IsLocked: obj.IsLocked,
      LastModified: obj.LastModified,
      Pos: obj.Pos,
      IsShowing: obj.IsShowing,
      IsShowingCheckedGrocery: obj.IsShowingCheckedGrocery,
      IsShowingCheckedStep: obj.IsShowingCheckedStep,
      IsShowingCheckedMedicine: obj.IsShowingCheckedMedicine,
      IsShowingCheckedExercise: obj.IsShowingCheckedExercise,
      Tags: obj.Tags,
    };
    
    return {...DefaultObjective, ...safe};
  },

  
  doItemNewAttributeCheck(item: any): any {
    const base: Item = {
      ItemId: typeof item.ItemId === 'string' ? item.ItemId : '',
      UserIdObjectiveId: typeof item.UserIdObjectiveId === 'string' ? item.UserIdObjectiveId : '',
      Type: Object.values(ItemType).includes(item.Type) ? item.Type : ItemType.Step,
      Pos: typeof item.Pos === 'number' ? item.Pos : 0,
      LastModified: typeof item.LastModified === 'string' ? item.LastModified : '',
    };

    switch (base.Type) {
      case ItemType.Step:
        return {
          ...DefaultStep,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          Done: typeof item.Done === 'boolean' ? item.Done : false,
          Importance: typeof item.Importance === 'number' ? item.Importance : StepImportance.None,
          AutoDestroy: typeof item.AutoDestroy === 'boolean' ? item.AutoDestroy : false,
        };

      case ItemType.Wait:
        return {
          ...DefaultWait,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
        };

      case ItemType.Question:
        return {
          ...DefaultQuestion,
          ...base,
          Statement: typeof item.Statement === 'string' ? item.Statement : '',
          Answer: typeof item.Answer === 'string' ? item.Answer : '',
        };

      case ItemType.Note:
        return {
          ...DefaultNote,
          ...base,
          Text: typeof item.Text === 'string' ? item.Text : '',
        };

      case ItemType.Location:
        return {
          ...DefaultLocation,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          Url: typeof item.Url === 'string' ? item.Url : '',
          IsShowingMap: typeof item.IsShowingMap === 'boolean' ? item.IsShowingMap : false,
        };

      case ItemType.Divider:
        return {
          ...DefaultDivider,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          IsOpen: typeof item.IsOpen === 'boolean' ? item.IsOpen : true,
        };

      case ItemType.Grocery:
        return {
          ...DefaultGrocery,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          IsChecked: typeof item.IsChecked === 'boolean' ? item.IsChecked : false,
          Quantity: typeof item.Quantity === 'number' ? item.Quantity : 0,
          Unit: typeof item.Unit === 'string' ? item.Unit : '',
          GoodPrice: typeof item.GoodPrice === 'string' ? item.GoodPrice : '',
        };

      case ItemType.Medicine:
        return {
          ...DefaultMedicine,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          IsChecked: typeof item.IsChecked === 'boolean' ? item.IsChecked : false,
          Quantity: typeof item.Quantity === 'number' ? item.Quantity : 0,
          Unit: typeof item.Unit === 'string' ? item.Unit : '',
          Purpose: typeof item.Purpose === 'string' ? item.Purpose : '',
          Components: Array.isArray(item.Components) ? item.Components : [],
        };

      case ItemType.Exercise:
        return {
          ...DefaultExercise,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          IsDone: typeof item.IsDone === 'boolean' ? item.IsDone : false,
          Reps: typeof item.Reps === 'number' ? item.Reps : 0,
          Series: typeof item.Series === 'number' ? item.Series : 0,
          MaxWeight: typeof item.MaxWeight === 'string' ? item.MaxWeight : '',
          Description: typeof item.Description === 'string' ? item.Description : '',
          Weekdays: Array.isArray(item.Weekdays) ? item.Weekdays : [],
          LastDone: typeof item.LastDone === 'string' ? item.LastDone : '',
          BodyImages: Array.isArray(item.BodyImages) ? item.BodyImages : [],
        };

      case ItemType.Links:
        return {
          ...DefaultLink,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          Link: typeof item.Link === 'string' ? item.Link : '',
        };

      case ItemType.Image:
        return {
          ...DefaultImage,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          Name: typeof item.Name === 'string' ? item.Name : '',
          Size: typeof item.Size === 'number' ? item.Size : 0,
          Width: typeof item.Width === 'number' ? item.Width : 0,
          Height: typeof item.Height === 'number' ? item.Height : 0,
          IsDisplaying: typeof item.IsDisplaying === 'boolean' ? item.IsDisplaying : true,
        };

      case ItemType.ItemFake:
      default:
        return { ...DefaultItem, ...base };
    }
  },

  //OK for response
  async queryObjectiveList(userId: string): Promise<QueryOutput> {
    const params = {
      TableName: objectivesTableName,
      KeyConditionExpression: "UserId = :UserId",
      ExpressionAttributeValues: {
        ":UserId": userId,
      },
    };

    return await dynamoDB.query(params).promise();
  },
  //^ HTTP - CHECK
  async getObjectiveList(userId: string): Promise<Response>{
    try {
      
      const result = await this.queryObjectiveList(userId);

      if(!result.Items){
        return {
          ...DefaultNotFound,
          message: 'No objetives found.',
        }
      }

      const items = (result.Items ?? []) as unknown as Objective[];
      const newObjs = items.map(obj => this.doObjectiveNewAttributeCheck(obj));

      return {...DefaultOk, body: JSON.stringify(newObjs) }
    } catch (err) {
      log.err('getObjectiveList','err', err);
      const response: Response = {...DefaultInternalServerError,
        message: 'Problem trying to get objective list from database.',
        exception: JSON.stringify(err),
      };
      return response;
    }
  },
  async queryObjectiveItemList(userIdObjectiveId: string): Promise<QueryOutput> {
    const params = {
      TableName: itemsTableName,
      KeyConditionExpression: 'UserIdObjectiveId = :UserIdObjectiveId',
      ExpressionAttributeValues: {
          ':UserIdObjectiveId': userIdObjectiveId
      }
    };
    return await dynamoDB.query(params).promise();
  },
  //^ HTTP - CHECK
  async getObjectiveItemList(userIdObjectiveId: string): Promise<Response>{
    try {
      const result = await this.queryObjectiveItemList(userIdObjectiveId);

      const items = (result.Items ?? []) as unknown as Item[];
      const newItems = items.map(i => this.doItemNewAttributeCheck(i));

      if(!result.Items){
        return {...DefaultNotFound,
          statusCode: Codes.NotFound, 
          message: 'No items found.',
        }
      }

      return {...DefaultOk, body: JSON.stringify(newItems) }
    } catch (err) {
      log.err('getObjectiveItemList', 'err', err);
      return {...DefaultInternalServerError,
        message: 'Problem trying to get item list from database.',
        exception: JSON.stringify(err),
      };
    }
  },
  //^ HTTP - CHECK
  async getObjective(userId: string, objectiveId: string): Promise<Response>{
    try {
      const params ={
        TableName: objectivesTableName,
        Key:{ UserId: userId, ObjectiveId: objectiveId }
      }
  
      const result:GetItemOutput = await dynamoDB.get(params).promise();
      if(!result.Item) return {...DefaultNotFound, message: 'No objective found.'}
  
      const element = this.doObjectiveNewAttributeCheck(result.Item as unknown as Objective);

      return { ...DefaultOk, body: JSON.stringify(element) }
    } catch (err) {
      log.err('getObjective', 'err', err);
      return {...DefaultInternalServerError,
        message: 'Problem trying to get objective from database.',
        exception: JSON.stringify(err),
      };
    }
  },
  //^ HTTP - CHECK - 10ARRAY
  async putObjectives(userId: string, objectives: Objective[]): Promise<Response>{
    try {
      if(objectives.length > 10) 
        return {...DefaultBadRequest, success: false, message: "You can't put more than 10 objectives per same request."}

      let resData: Objective[] = [];
      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];

        //^ Make sure the correct userId
        obj.UserId = userId; 
        if(obj.ObjectiveId === "") obj.ObjectiveId = generateId();
        
        const newObj:Objective = this.doObjectiveNewAttributeCheck(obj);

        const params = {
          TableName: objectivesTableName,
          Item: { ...newObj }
        }
        await dynamoDB.put(params).promise();

        resData.push(obj);
      }
      
      return {...DefaultOk, body: JSON.stringify(resData), }
    } catch (err) {
      log.err('putObjective', 'err', err);
      return {...DefaultResponse,
          message: 'Problem trying to put objectives from database.',
          exception: JSON.stringify(err),
      };
    }
  },
  //^ HTTP - CHECK
  async deleteObjective(userId: string, objective: Objective): Promise<Response>{
    try {
      //^ First delete all Items of this Objective
      const result = await this.queryObjectiveItemList(userId+objective.ObjectiveId);
      const items = (result.Items ?? []) as unknown as Item[];
      if(result.Items && result.Items.length > 0){
        await this.deleteObjectiveItems(userId, items);
      }

      //^Now delete Objective
      const params = {
        TableName: objectivesTableName,
        Key: { UserId: userId, ObjectiveId: objective.ObjectiveId }
      };
  
      await dynamoDB.delete(params).promise();
  
      return {...DefaultOk, statusCode: Codes.OK, };
    } catch (err) {
      log.err('deleteObjective', 'err', err);
      return {...DefaultInternalServerError,
        message: 'Problem trying to delete objective from database.',
        exception: JSON.stringify(err),
      };
    }
  },
  //^ HTTP - CHECK
  async getObjectiveItem(userIdObjectiveId: string, itemId: string): Promise<Response>{
    try {
      const params ={
        TableName: itemsTableName,
        Key:{ UserIdObjectiveId: userIdObjectiveId, ItemId: itemId }
      }
  
      let res: Response;
      const result = await dynamoDB.get(params).promise();
  
      if(result.Item){
        res = { ...DefaultOk, body: JSON.stringify(result.Item) }
      }
      else{
        res = {...DefaultNotFound,
          message: 'Not item found.',
        }
      }
  
      return res;
    } catch (err) {
      log.err('getItem', 'err', err);
      return {...DefaultInternalServerError,
        message: 'Problem trying to get item from database.',
        exception: JSON.stringify(err),
      };
    }
  },
  //^ HTTP - CHECK - 10ARRAY
  async putObjectiveItems(userId: string, items: Item[]): Promise<Response>{
    try {
      if(items.length > 10){
        return {...DefaultBadRequest,
          success: false, message: "You can't put more than 10 items per same request."
        }
      }

      let res: Response;
      let resData: Item[] = [];
      try {
        for (let i = 0; i < items.length; i++) {
          items[i].UserIdObjectiveId = userId + ((items[i].UserIdObjectiveId.length > 40) ? items[i].UserIdObjectiveId.slice(-40) : items[i].UserIdObjectiveId);
    
          if(items[i].ItemId === "") items[i].ItemId = generateId();

          const newItem:Objective = this.doItemNewAttributeCheck(items[i]);
    
          const params = {
            TableName: itemsTableName,
            Item: { ...newItem }
          }
          await dynamoDB.put(params).promise();
          resData.push(items[i]);
        }
      } catch (err) {log.err('putObjectives loop', 'err', err);}
      
      res = {...DefaultOk,
        body: JSON.stringify(items),
      }

      return res;
    } catch (err) {
      log.err('putItem', 'err', err);
      const response: Response = {...DefaultInternalServerError,
        message: 'Problem trying to put item from database.',
        exception: JSON.stringify(err),
      };
      return response;
    }
  },
  //^ HTTP - CHECK - 10ARRAY
  async deleteObjectiveItems(userId:string, items: Item[]): Promise<Response>{
    try {
      if(items.length > 10){
        return {...DefaultBadRequest,
          success: false, message: "You can't delete more than 10 items per same request."
        }
      }

      let resData: Item[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        item.UserIdObjectiveId = userId + ((item.UserIdObjectiveId.length > 40) ? item.UserIdObjectiveId.slice(-40) : item.UserIdObjectiveId);

        const params = {
          TableName: itemsTableName,
          Key: { UserIdObjectiveId: item.UserIdObjectiveId, ItemId: item.ItemId }
        };
        try {
          await dynamoDB.delete(params).promise();
        } catch (err) {}


      }
      return {...DefaultOk,
        body: JSON.stringify(resData),
      };
    } catch (err) {
      log.err('deleteItem', 'err', err);
      return {...DefaultInternalServerError,
        message: 'Problem trying to delete item from database.',
        exception: JSON.stringify(err),
      };
    }
  },
  //^ HTTP - CHECK - 10ARRAY
  async syncObjectivesList(userId: string, objectivesList: ObjectiveList): Promise<Response> {
    try {
      //! GET DB ITEMS FOR LATER
      let dbItems: Item[] = [];
      let dbObjectives: Objective[] = [];

      const result: QueryOutput = await this.queryObjectiveList(userId);
      if(result.Items) {
        dbObjectives = result.Items as unknown as Objective[];
        for(let i = 0; i < dbObjectives.length; i++){
          const rtnItemList: QueryOutput = await this.queryObjectiveItemList(userId + dbObjectives[i].ObjectiveId);
          
          if(rtnItemList.Items){
            dbItems.push(...(rtnItemList.Items as unknown as Item[]));
          }
        }
      }

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
            await this.deleteObjectiveItems(userId, [deleteItem]);
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
              await this.putObjectiveItems(userId, [item]);
              // log.d('Item updated', item);
            }
            else{
              // log.d('Item: ' + item + ' was denied because of date comparion. ', dbDate.toISOString(), syncDate.toISOString());
            }
          }
          else{
            await this.putObjectiveItems(userId, [item]);
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
              await this.putObjectives(userId, [objective]);
            }
            else{
              // log.d('Objective: ' + objective.Title + ' was denied because of date comparion. ', dbDate.toISOString(), syncDate.toISOString());
            }
          }
          else{
            await this.putObjectives(userId, [objective]);
          }
        }
      }
      log.d('db - objs putted');

      //^ Getting the final objective and item list
      const queryObjectives: QueryOutput = await this.queryObjectiveItemList(userId);

      if(!queryObjectives.Items){
        return {...DefaultInternalServerError,
          message: 'Problem trying to get objectives list from database.'
        }
      }
      
      log.d('db - got new obj list');

      let newObjectives: Objective[] = queryObjectives.Items as unknown as Objective[];
      let newItems: Item[] = []
      for(let i = 0; i < newObjectives.length; i++){
        const queryItems: QueryOutput = await this.queryObjectiveItemList(userId + newObjectives[i].ObjectiveId);
        if(!queryItems.Items)
          return {...DefaultInternalServerError,message: 'Problem trying to get objectives list from database.'}

        newItems.push(...(queryItems.Items as unknown as Item[]));
      }


      log.d('db - added new items to list');
      const rtnObjectiveList: ObjectiveList = {Objectives: newObjectives, Items: newItems}

      log.d('db - returning');

      return {...DefaultOk, body: JSON.stringify(rtnObjectiveList)}
    } catch (err) {
      log.err('db.syncObjectivesList', 'err', err);
      return {...DefaultInternalServerError,
        message: 'Problem trying to SyncObjectivesList from database.',
        exception: JSON.stringify(err),
      };
    }
  },

  async getService(): Promise<Response>{
    try {
      const params ={
        TableName: servicesTableName,
        Key:{ Name: 'GroceryListServerless' }
      }
  
      let res: Response
      const result = await dynamoDB.get(params).promise();
  
      if(result.Item){
        res = { ...DefaultOk, body:JSON.stringify(result.Item) }
      }
      else{
        res = { ...DefaultNoContent }
      }
  
      return res;
    } catch (err) {
      const response: Response = {...DefaultInternalServerError,
        message: 'Problem trying to get status from database.',
        exception: JSON.stringify(err),
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