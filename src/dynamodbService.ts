import { GetItemOutput, QueryOutput } from "aws-sdk/clients/dynamodb";
import log from "./log";
import { Codes, DefaultDivider, DefaultExercise, DefaultGrocery, DefaultHouse, DefaultImage, DefaultItem, DefaultLink, DefaultLocation, DefaultMedicine, DefaultNote, DefaultObjective, DefaultQuestion, DefaultResponse, DefaultStep, DefaultWait, DeviceData, InternalServerError, Item, ItemType, Objective, ObjectiveList, Response, Service, StepImportance } from "./types";

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

      case ItemType.Link:
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

      case ItemType.House:
        return {
          ...DefaultHouse,
          ...base,
          Title: typeof item.Title === 'string' ? item.Title : '',
          Listing: typeof item.Listing === 'string' ? item.Listing : '',
          MapLink: typeof item.MapLink === 'string' ? item.MapLink : '',
          MeterSquare: typeof item.MeterSquare === 'string' ? item.MeterSquare : '',
          Rating: typeof item.Rating === 'number' ? item.Rating : 0,
          Address: typeof item.Address === 'string' ? item.Address : '',
          TotalPrice: typeof item.TotalPrice === 'number' ? item.TotalPrice : 0,
          WasContacted: typeof item.WasContacted === 'boolean' ? item.WasContacted : true,
          Details: typeof item.Details === 'string' ? item.Details : '',
          Attention: typeof item.Attention === 'string' ? item.Attention : '',
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
  async getObjectiveList(userId: string): Promise<Objective[]|null>{
    const result = await this.queryObjectiveList(userId);

    if(result.Items){
      const objs = result.Items as unknown as  Objective[];
      const newObjs = objs.map(obj => this.doObjectiveNewAttributeCheck(obj));
      return newObjs;
    }

    return null;
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
  async getObjectiveItemList(userIdObjectiveId: string): Promise<Item[]|null>{
    const result = await this.queryObjectiveItemList(userIdObjectiveId);

    if(result.Items){
      const items = result.Items as unknown as Item[];
      const newItems = items.map(i => this.doItemNewAttributeCheck(i));
      return newItems;
    }

    return null;
  },
  async getObjective(userId: string, objectiveId: string): Promise<Objective|null>{
    const params ={
      TableName: objectivesTableName,
      Key:{ UserId: userId, ObjectiveId: objectiveId }
    }

    const result:GetItemOutput = await dynamoDB.get(params).promise();
    if(result.Item){
      return this.doObjectiveNewAttributeCheck(result.Item as unknown as Objective);;
    }
    
    return null;
  },
  async putObjectives(userId: string, objectives: Objective[]): Promise<boolean>{
    if(objectives.length > 10) 
      return false;

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
    }
    
    return true;
  },
  async deleteObjectives(userId: string, objectives: Objective[]): Promise<Objective[]|null>{
    if(objectives.length > 10) return null;

    for (let i = 0; i < objectives.length; i++) {
      const objective = objectives[i];
      
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
    }
    
    return objectives;
  },
  async getObjectiveItem(userIdObjectiveId: string, itemId: string): Promise<Item|null>{
    const params ={
      TableName: itemsTableName,
      Key:{ UserIdObjectiveId: userIdObjectiveId, ItemId: itemId }
    }

    const result = await dynamoDB.get(params).promise();

    if(result.Item){
      return this.doItemNewAttributeCheck(result.Item);
    }

    return null;
  },
  async putObjectiveItems(userId: string, items: Item[]): Promise<boolean>{ // TODO needs treatment for partial put
    log.d('db.putObjectiveItems - ', items.length)
    if(items.length > 10) {
      log.d('db.putObjectiveItems - items array bigger than 10. ' + items.length)
      return false;
    }

    const checkedItems:Item[] = items.map(item => this.doItemNewAttributeCheck(item));
    log.d('db.putObjectiveItems - checkedItems - ', checkedItems)

    // await dynamoDB.transactWrite({
    //   TransactItems: checkedItems.map(item => ({
    //     Put: {
    //       TableName: itemsTableName,
    //       Items: item
    //     }
    //   })
    // )}).promise();

    for (let i = 0; i < items.length; i++) {
      items[i].UserIdObjectiveId = userId + ((items[i].UserIdObjectiveId.length > 40) ? items[i].UserIdObjectiveId.slice(-40) : items[i].UserIdObjectiveId);

      if(items[i].ItemId === "") items[i].ItemId = generateId();

      const newItem:Objective = this.doItemNewAttributeCheck(items[i]);
      log.d('db.putObjectiveItems - newItem - ', newItem)

      const params = {
        TableName: itemsTableName,
        Item: { ...newItem }
      }
      await dynamoDB.put(params).promise();

      log.d('db.putObjectiveItems - newItem - ok')
    }
    
    log.d('db.putObjectiveItems - newItem - ok')
    return true;
  },
  async deleteObjectiveItems(userId:string, items: Item[]): Promise<Item[]|null>{ // TODO needs treatment for partial delete
    if(items.length > 10) return null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      item.UserIdObjectiveId = userId + ((item.UserIdObjectiveId.length > 40) ? item.UserIdObjectiveId.slice(-40) : item.UserIdObjectiveId);

      const params = {
        TableName: itemsTableName,
        Key: { UserIdObjectiveId: item.UserIdObjectiveId, ItemId: item.ItemId }
      };
      await dynamoDB.delete(params).promise();
    }

    return items;
  },
  async syncObjectivesList(userId: string, objectivesList: ObjectiveList): Promise<ObjectiveList|null> {
    try {
      //! GET DB ITEMS FOR LATER
      let dbItems: Item[] = [];
      let dbObjectives: Objective[] = [];

      log.d('syncObjectivesList - userId', userId);
      const result: QueryOutput = await this.queryObjectiveList(userId);
      log.d('syncObjectivesList - result', result);
      if(result.Items) {
        dbObjectives = result.Items as unknown as Objective[];
        for(let i = 0; i < dbObjectives.length; i++){
          const rtnItemList: QueryOutput = await this.queryObjectiveItemList(userId + dbObjectives[i].ObjectiveId);
          
          if(rtnItemList.Items){
            dbItems.push(...(rtnItemList.Items as unknown as Item[]));
          }
        }
      }
      log.d('syncObjectivesList - dbItems', dbItems);
      log.d('syncObjectivesList - dbObjectives', dbObjectives);

      //! DELETE OBJECTIVES
      if (objectivesList.DeleteObjectives?.length) {
        const deletedObjectives = objectivesList.DeleteObjectives.filter(
          o => o && o.ObjectiveId
        );

        await Promise.all(
          deletedObjectives.map(o => this.deleteObjectives(userId, [o]))
        );

        log.d(`Deleted ${deletedObjectives.length} objectives`);
      }
      // if(objectivesList.DeleteObjectives) {
      //   const deletedObjectives = objectivesList.DeleteObjectives;
      //   for(let i = 0; i < deletedObjectives.length; i++){
      //     const deleteObjective = deletedObjectives[i];
      //     if(deleteObjective && deleteObjective.ObjectiveId){
      //       await this.deleteObjectives(userId, [deleteObjective]);
      //     }
      //   }
      // }
      log.d('db - obj deleted');

      //! DELETE ITEMS
      if (objectivesList.DeleteItems?.length) {
        const deletedItems = objectivesList.DeleteItems.filter(
          i => i && i.UserIdObjectiveId && i.ItemId
        );

        await Promise.all(
          deletedItems.map(i => this.deleteObjectiveItems(userId, [i]))
        );

        log.d(`Deleted ${deletedItems.length} items`);
      }
      // if(objectivesList.DeleteItems) {
      //   const deletedItems = objectivesList.DeleteItems;
      //   for(let i = 0; i < deletedItems.length; i++){
      //     const deleteItem = deletedItems[i];
      //     if(deleteItem.UserIdObjectiveId && deleteItem.ItemId){
      //       await this.deleteObjectiveItems(userId, [deleteItem]);
      //     }
      //   }
      // }
      log.d('db - deletedItems');

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

        log.d(`Synced ${items.length} items`);
        }
      // if(objectivesList.Items) {
      //   let items = objectivesList.Items;
      //   for(let i = 0; i < items.length; i++){
      //     const item = items[i];
      //     const equalIt = dbItems.find(it => it.UserIdObjectiveId === item.UserIdObjectiveId);
          
      //     if(equalIt && equalIt.LastModified && item.LastModified){
      //       const syncDate: Date = new Date(item.LastModified);
      //       const dbDate: Date = new Date(equalIt.LastModified);
            
      //       if(dbDate < syncDate) {
      //         await this.putObjectiveItems(userId, [item]);
      //         // log.d('Item updated', item);
      //       }
      //       else{
      //         // log.d('Item: ' + item + ' was denied because of date comparion. ', dbDate.toISOString(), syncDate.toISOString());
      //       }
      //     }
      //     else{
      //       await this.putObjectiveItems(userId, [item]);
      //       // log.d('else', item);
      //     }
      //   }
      // }
      log.d('db - items putted');

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

        log.d(`Synced ${objectives.length} objectives`);
      }
      // if(objectivesList.Objectives) {
      //   let objectives = objectivesList.Objectives;
      //   for(let i = 0; i < objectives.length; i++){
      //     const objective = objectives[i];
      //     const equalCat = dbObjectives.find(cat => cat.ObjectiveId === objective.ObjectiveId);
  
      //     if(equalCat && equalCat.LastModified && objective.LastModified){
      //       const dbDate: Date = new Date(equalCat.LastModified);
      //       const syncDate: Date = new Date(objective.LastModified);
  
      //       if(dbDate < syncDate) {
      //         await this.putObjectives(userId, [objective]);
      //       }
      //       else{
      //         // log.d('Objective: ' + objective.Title + ' was denied because of date comparion. ', dbDate.toISOString(), syncDate.toISOString());
      //       }
      //     }
      //     else{
      //       await this.putObjectives(userId, [objective]);
      //     }
      //   }
      // }
      log.d('db - objs putted');

      //^ Getting the final objective and item list
      const queryObjectives: QueryOutput = await this.queryObjectiveList(userId);

      if(!queryObjectives.Items){
        return null
      }
      
      log.d('db - queryObjectives ', queryObjectives);

      let newObjectives: Objective[] = queryObjectives.Items as unknown as Objective[];
      let newItems: Item[] = []
      for(let i = 0; i < newObjectives.length; i++){
        const queryItems: QueryOutput = await this.queryObjectiveItemList(userId + newObjectives[i].ObjectiveId);
        if(!queryItems.Items)
          return null;

        newItems.push(...(queryItems.Items as unknown as Item[]));
      }
      log.d('db - newItems ', newItems);

      const rtnObjectiveList: ObjectiveList = {Objectives: newObjectives, Items: newItems}

      return rtnObjectiveList;
    } catch (err) {
      log.err('db.syncObjectivesList', 'err', err);
      return null;
    }
  },

  async getService(): Promise<Service|null> {
    const params = {
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