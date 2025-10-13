import log from "./log";
import AWS from 'aws-sdk';
import db from "./dynamodbService";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Codes, Response, DBUser, AuthenticationToken, Objective, Item, ObjectiveList, PresignedUrl, ImageInfo, Image, ItemType, DeviceData, Exercise, Medicine, Grocery, Divider, Question, Note, Wait, Step, StepImportance, Link, Location } from "./types";

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

//! Method responsable for calling authenticate lambda
const validateToken = async (event: any, role: string[] = ['Basic', 'Admin', 'Guest']): Promise<Response<DBUser>> => { //todo change the return
  try {
    const respStatus = await db.getService();
    if(respStatus.WasAnError || !respStatus.Data)
      return { WasAnError: true, Code: respStatus.Code?? Codes.InternalServerError, Message: respStatus.Message?? 'There was an error trying to get the service status from database.'};
    //Service is on?
    if(!respStatus.Data.Up) return { WasAnError: true, Code: Codes.ServiceUnavailable, Message: 'Identity Service is turned off. ' + respStatus.Data.UpReason };
    
    const authToken = event.headers.Authorization || event.headers.authorization;
    if (authToken) { 
      const token: AuthenticationToken = { JwtToken: authToken.replace('Bearer ', '') };
      const params = {
        FunctionName: process.env.FC_AUTHENTICATE_FUNCTION_NAME ||'',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(token),
      };

      const data = await lambda.invoke(params).promise();
      const respDBUser: Response<DBUser> = JSON.parse(data.Payload as string) as Response<DBUser>;
      if(respDBUser.WasAnError || respDBUser.Data === null || respDBUser.Data === undefined)
        return { WasAnError: true, Message: respDBUser.Message??'There was an problem with authorization token.', Code:respDBUser.Code?? Codes.Unauthorized};

      if(!role.includes(respDBUser.Data.Role))
        return { WasAnError: true, Message: `Your role can't access this.`, Code: Codes.Unauthorized };
      return respDBUser;
    }
    else{
      return {
        WasAnError: true,
        Message: 'There was an error getting authorization header.', 
        Code: Codes.Unauthorized
      };
    }
  } catch (err) {
    log.err('validateToken', 'err', JSON.stringify(err, null ,2));
    return {
      WasAnError: true,
      Message: 'There was an error validating the jwt token.',
      Exception: JSON.stringify(err, null ,2), 
      Code: Codes.Unauthorized
    };
  }
}

const checkObjective = (o: Objective): Objective => {
  return(
    {
      UserId: String(o.UserId ?? ''),
      ObjectiveId: String(o.ObjectiveId ?? ''),
      Title: String(o.Title ?? ''),
      Done: Boolean(o.Done ?? false),
      Theme: String(o.Theme ?? ''),
      IsArchived: Boolean(o.IsArchived ?? false),
      IsShowing: Boolean(o.IsShowing ?? true),
      IsLocked: Boolean(o.IsLocked ?? false),
      LastModified: String(o.LastModified ?? new Date().toISOString()),
      Pos: Number(o.Pos ?? 0),
      IsShowingCheckedGrocery: Boolean(o.IsShowingCheckedGrocery ?? false),
      IsShowingCheckedStep: Boolean(o.IsShowingCheckedStep ?? false),
      IsShowingCheckedMedicine: Boolean(o.IsShowingCheckedMedicine ?? false),
      IsShowingCheckedExercise: Boolean(o.IsShowingCheckedExercise ?? false),
      Tags: Array.isArray(o.Tags) ? o.Tags.map(String) : [],
    }
  )
}

export const checkItem = (i: Item): Item => {
  const base: Item = {
    ItemId: String(i.ItemId ?? ''),
    UserIdObjectiveId: String(i.UserIdObjectiveId ?? ''),
    Type: Number.isInteger(i.Type) ? i.Type : ItemType.Note,
    Pos: Number(i.Pos ?? 0),
    LastModified: String(i.LastModified ?? new Date().toISOString()),
  };

  switch (base.Type) {
    case ItemType.Step:
      return {
        ...base,
        Title: String((i as Step).Title ?? ''),
        Done: Boolean((i as Step).Done ?? false),
        Importance: Number((i as Step).Importance ?? StepImportance.None),
        AutoDestroy: Boolean((i as Step).AutoDestroy ?? false),
      } as Step;

    case ItemType.Wait:
      return {
        ...base,
        Title: String((i as Wait).Title ?? ''),
      } as Wait;

    case ItemType.Note:
      return {
        ...base,
        Text: String((i as Note).Text ?? ''),
      } as Note;

    case ItemType.Question:
      return {
        ...base,
        Statement: String((i as Question).Statement ?? ''),
        Answer: String((i as Question).Answer ?? ''),
      } as Question;

    case ItemType.Location:
      return {
        ...base,
        Title: String((i as Location).Title ?? ''),
        Url: String((i as Location).Url ?? ''),
        IsShowingMap: Boolean((i as Location).IsShowingMap ?? false),
      } as Location;

    case ItemType.Divider:
      return {
        ...base,
        Title: String((i as Divider).Title ?? ''),
        IsOpen: Boolean((i as Divider).IsOpen ?? false),
      } as Divider;

    case ItemType.Grocery:
      return {
        ...base,
        Title: String((i as Grocery).Title ?? ''),
        IsChecked: Boolean((i as Grocery).IsChecked ?? false),
        Quantity: Number((i as Grocery).Quantity ?? 0),
        Unit: String((i as Grocery).Unit ?? ''),
        GoodPrice: String((i as Grocery).GoodPrice ?? ''),
      } as Grocery;

    case ItemType.Medicine:
      return {
        ...base,
        Title: String((i as Medicine).Title ?? ''),
        IsChecked: Boolean((i as Medicine).IsChecked ?? false),
        Quantity: Number((i as Medicine).Quantity ?? 0),
        Unit: String((i as Medicine).Unit ?? ''),
        Purpose: String((i as Medicine).Purpose ?? ''),
        Components: (i as Medicine).Components?.map(String) ?? [],
      } as Medicine;

    case ItemType.Exercise:
      return {
        ...base,
        Title: String((i as Exercise).Title ?? ''),
        IsDone: Boolean((i as Exercise).IsDone ?? false),
        Reps: Number((i as Exercise).Reps ?? 0),
        Series: Number((i as Exercise).Series ?? 0),
        MaxWeight: String((i as Exercise).MaxWeight ?? ''),
        Description: String((i as Exercise).Description ?? ''),
        Weekdays: Array.isArray((i as Exercise).Weekdays)
          ? (i as Exercise).Weekdays.map(Number)
          : [],
        LastDone: String((i as Exercise).LastDone ?? ''),
        BodyImages: Array.isArray((i as Exercise).BodyImages)
          ? (i as Exercise).BodyImages.map(String)
          : [],
      } as Exercise;

    case ItemType.Links:
      return {
        ...base,
        Title: String((i as Link).Title ?? ''),
        Link: String((i as Link).Link ?? ''),
      } as Link;

    case ItemType.Image:
      return {
        ...base,
        Title: String((i as Image).Title ?? ''),
        Name: String((i as Image).Name ?? ''),
        Size: Number((i as Image).Size ?? 0),
        Width: Number((i as Image).Width ?? 0),
        Height: Number((i as Image).Height ?? 0),
        IsDisplaying: Boolean((i as Image).IsDisplaying ?? false),
      } as Image;

    case ItemType.ItemFake:
      return { ...base } as Item;

    default:
      return base;
  }
};

export const isUpObjective = async (event: any) => {
  return { statusCode: 200, body: 'Am I alive?' };
}

export const deleteS3Image = async (userId: string, itemId:string, fileName:string):Promise<boolean> => {
  try {
    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const key = `${userId}/${itemId}/${fileName}`;

    const params = { Bucket: bucketName, Key: key, };

    await s3.deleteObject(params).promise();

    //* Happy path
    return true;
  } catch (err) {
    log.err('deleteS3Image', 'err', err);
    return false;
  }
};

export const getObjectiveList = async (event: any): Promise<Response<Objective[]>> => {
  try {
    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //Database access
    const respList = await db.getObjectiveList(respAuth.Data.UserId);
    if(respList.WasAnError)
      return {...respList, Code: respList.Code?? Codes.InternalServerError, Message: 'There was an error trying to get objective list.' };

    //*Happy path
    return {...respList, Code: respList.Code?? Codes.OK };
  } catch (err) {
    return { 
      success: false, 
      code: Codes.InternalServerError,
      message: 'There was an untreated error on GetObjectiveList.', 
      exception: JSON.stringify(err) 
    };
  }
}
export const getObjectiveItemList = async (event: any): Promise<Response<Item[]>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 

    //!Parsing problem
    const objectiveId: {ObjectiveId: string} = JSON.parse(event.body);
    if(!objectiveId.ObjectiveId || objectiveId.ObjectiveId.trim() === '')
      return { WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.'};

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null)
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};

    //Database access
    const respList = await db.getObjectiveItemList(respAuth.Data.UserId + objectiveId.ObjectiveId);
    if(respList.WasAnError)
      return {...respList, Code: respList.Code?? Codes.InternalServerError, Message: 'There was an error trying to get objective item list.' };

    //*Happy path
    return {...respList, Code: respList.Code?? Codes.OK }
  } catch (err) {
    log.err('getObjectiveItemList', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on GetObjectiveItemList.', 
      Exception: JSON.stringify(err),
    };
  }
}
export const getObjective = async (event: any): Promise<Response<Objective>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 

    //!Parsing problem
    const body: {ObjectiveId: string} = JSON.parse(event.body);
    if(body.ObjectiveId === null || body.ObjectiveId === undefined) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //Database access
    const responseObjective = await db.getObjective(respAuth.Data.UserId, body.ObjectiveId);
    if(responseObjective.WasAnError)
      return {...responseObjective, Code: responseObjective.Code?? Codes.InternalServerError, Message: 'There was an error trying to get the objective.' };
  
    //*Happy path
    return {...responseObjective, Code: responseObjective.Code?? Codes.OK };
  } catch (err) {
    log.err('getObjective', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on GetObjective.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const putObjective = async (event: any): Promise<Response<Objective>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 

    //!Parsing problem
    const rawObj: Objective = JSON.parse(event.body);
    if(rawObj === null || rawObj === undefined) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};

    //!Manual clean of extra fields, I may change later
    const obj: Objective = checkObjective(rawObj);

    //Database access
    obj.UserId = respAuth.Data.UserId;
    const responseObjective = await db.putObjective(respAuth.Data.UserId, obj);
    if(responseObjective.WasAnError)
      return {...responseObjective, Code: responseObjective.Code?? Codes.InternalServerError, Message: 'There was an error trying to put the objective.' };
  
    //*Happy path
    return {...responseObjective, Code: responseObjective.Code?? Codes.OK };
  } catch (err) {
    log.err('putObjective', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on PutObjective.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const putObjectives = async (event: any): Promise<Response<Objective[]>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    const rawObjs: Objective[] = JSON.parse(event.body);

    //!Parsing problem
    if(rawObjs === null || rawObjs === undefined) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Max array size
    if(rawObjs.length > 10)
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'Too many items.' }

    //!Manual clean of extra fields, I may change later
    const objs: Objective[] = rawObjs.map((o: any) => (checkObjective(o)));

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};

    //Database access
    const responseObjectives = await db.putObjectives(respAuth.Data.UserId, objs);
    if(responseObjectives.WasAnError)
      return {...responseObjectives, Code: responseObjectives.Code?? Codes.InternalServerError, Message: 'There was an error trying to put the objective.' };
  
    //*Happy path
    return {...responseObjectives, Code: responseObjectives.Code?? Codes.OK };
  } catch (err) {
    log.err('putObjectives', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on PutObjectives.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const deleteObjective = async (event: any): Promise<Response<boolean>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //!Parsing problem
    const objective: Objective = JSON.parse(event.body);
    if(!objective) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || !respAuth.Data) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //Database access
    const responseObjective = await db.deleteObjective(respAuth.Data.UserId, objective);
    if(responseObjective.WasAnError)
      return {...responseObjective, Data: false, Code: responseObjective.Code?? Codes.InternalServerError, Message: 'There was an error trying to delete the objective.' };
  
    //*Happy path
    return {...responseObjective, Data: true, Code: responseObjective.Code?? Codes.OK };
  } catch (err) {
    log.err('deleteObjective', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on DeleteObjective.', 
      Exception: JSON.stringify(err) 
    };
  }
}

export const getObjectiveItem = async (event: any): Promise<Response<Item>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //!Parsing problem
    const item: {UserIdObjectiveId: string, ItemId: string} = JSON.parse(event.body);
    if(item.UserIdObjectiveId === null || item.UserIdObjectiveId === undefined) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //Database access
    item.UserIdObjectiveId = respAuth.Data.UserId + ((item.UserIdObjectiveId.length > 40) ? item.UserIdObjectiveId.slice(-40) : item.UserIdObjectiveId);
    const respItem = await db.getObjectiveItem(respAuth.Data.UserId + item.UserIdObjectiveId, item.ItemId);
    if(respItem.WasAnError)
      return {...respItem, Code: respItem.Code?? Codes.InternalServerError, Message: 'There was an error trying to get the item.' };
  
    //*Happy path
    return {...respItem, Code: respItem.Code?? Codes.OK };
  } catch (err) {
    log.err('getObjectiveItem', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on GetObjectiveItem.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const putObjectiveItem = async (event: any): Promise<Response<Item>> => {
  try {
    // if(!event.body)
    // return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 

    //!Parsing problem
    const rawItem: Item = JSON.parse(event.body);
    if(!rawItem) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //!Manual clean of extra fields, I may change later
    const item: Item = checkItem(rawItem);

    //Database access
    const respItem = await db.putObjectiveItem(respAuth.Data.UserId, item);
    if(respItem.WasAnError)
      return {...respItem, Code: respItem.Code?? Codes.InternalServerError, Message: 'There was an error trying to put the item.' };
  
    //*Happy path
    return {...respItem, Code: respItem.Code?? Codes.OK };
  } catch (err) {
    log.err('putObjectiveItem', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on PutObjectiveItem.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const putObjectiveItems = async (event: any): Promise<Response<Item[]>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //!Parsing problem
    const rawitems: Item[] = JSON.parse(event.body);
    if(!rawitems) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Max array size
    if(rawitems.length > 10)
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'Too many items.' }
    
    //!Manual clean of extra fields, I may change later
    const items: Item[] = rawitems.map((i: Item) => (checkItem(i)));

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //Database access
    const respItem = await db.putObjectiveItems(respAuth.Data.UserId, items);
    if(respItem.WasAnError)
      return {...respItem, Code: respItem.Code?? Codes.InternalServerError, Message: 'There was an error trying to put the items.' };
  
    //*Happy path
    return {...respItem, Code: respItem.Code?? Codes.OK };
  } catch (err) {
    log.err('putObjectiveItems', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on PutObjectiveItems.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const deleteObjectiveItem = async (event: any) => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //!Parsing problem
    const item: Item = JSON.parse(event.body);
    if(!item) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }

    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || !respAuth.Data) 
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized'};
    
    //^Delete image in deleted Item
    if(item.Type === ItemType.Image){
      const deleteImage = item as Image;
      if(deleteImage.Name) await deleteS3Image(respAuth.Data.UserId, deleteImage.ItemId, deleteImage.Name);
    }

    //Database access
    const respItem = await db.deleteObjectiveItem(respAuth.Data.UserId, item);
    if(respItem.WasAnError)
      return {...respItem, Data: false, Code: respItem.Code?? Codes.InternalServerError, Message: 'There was an error trying to delete the item.' };
  
    //*Happy path
    return {...respItem, Data: true, Code: respItem.Code?? Codes.OK };
  } catch (err) {
    log.err('deleteObjectiveItem', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError, 
      Message: 'There was an untreated error on DeleteObjectiveItem.', 
      Exception: JSON.stringify(err) 
    };
  }
}
export const syncObjectivesList = async (event: any): Promise<Response<ObjectiveList>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null)
       return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized' };

    //!Parsing problem
    const objectivesList: ObjectiveList = JSON.parse(event.body);
    if(objectivesList === null || objectivesList === undefined) 
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }
  
    //^Delete images in deleted Items
    if(objectivesList.DeleteItems) {
      const deletedItems = objectivesList.DeleteItems;
      for(let i = 0; i < deletedItems.length; i++){
        const deleteItem = deletedItems[i];
        if(deleteItem.Type === ItemType.Image){
          const deleteImage = deletedItems[i] as Image;
          if(deleteImage.UserIdObjectiveId && deleteImage.UserIdObjectiveId && deleteImage.ItemId && deleteImage.Name){
            //await deleteS3Image(respAuth.Data.UserId, deleteImage.ItemId, deleteImage.FileName);
          }
        }
      }
    }

    const respList = await db.syncObjectivesList(respAuth.Data.UserId, objectivesList);
  
    if(respList.WasAnError)
      return {...respList, Code: respList.Code?? Codes.InternalServerError, Message: 'There was an error trying to get objective item list.' };

    //*Happy path
    return {...respList, Code: respList.Code?? Codes.OK }
  } catch (err) {
    log.err('syncGroceryList', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError,
      Message: 'There was an untreated error on Sync Objective List.', 
      Exception: JSON.stringify(err) 
    };
  }
}

export const backupData = async (event: any): Promise<Response<boolean>> => {
  try {
    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null)
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized' };

    //^Get data to backup
    const empty: ObjectiveList = {DeleteItems: [], DeleteObjectives: [], Items: [], Objectives:[]};
    const respList = await db.syncObjectivesList(respAuth.Data.UserId, empty);

    //^Setup bucket
    const now = new Date().toISOString();
    const params = {
      Bucket: process.env.BK_OBJECTIVE_BACKUP_BUCKET_NAME || '',
      Key: `${respAuth.Data.UserId}/backup/${now}.json`,
      Body: JSON.stringify(respList.Data, null, 2),
      ContentType: "application/json"
    };

    await s3.putObject(params).promise();
    return { 
      WasAnError: false, 
      Code: Codes.OK,
      Message: 'OK',
      Data: true,
    };
  } catch (err) {
    log.err('backupData', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError,
      Message: 'There was an untreated error on Sync Objective List.', 
      Exception: JSON.stringify(err) 
    };
  }
}

export const getBackupDataList = async (event: any): Promise<Response<string>> => {
  try {
    //!Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if(respAuth.WasAnError || respAuth.Data === undefined || respAuth.Data === null)
      return { WasAnError: true, Code: respAuth.Code?? Codes.Unauthorized, Message: respAuth.Message?? 'Unauthorized' };

    const listResponse = await s3.listObjectsV2({
      Bucket: process.env.BK_OBJECTIVE_BACKUP_BUCKET_NAME || '',
      Prefix: `${respAuth.Data.UserId}/backup/`
    }).promise();
    
    // Extract only file names
    const fileNames: string[] = (listResponse.Contents ?? [])
      .map(obj => obj.Key?.split("/").pop() ?? "")
      .filter(name => name.length > 0); // Remove empty values (if any)

    return {
      WasAnError: false,
      Code: Codes.OK,
      Message: "OK",
      Data: JSON.stringify(fileNames), // Returns only file names
    };
  } catch (err) {
    log.err('getBackupDataList', 'err', err);
    return { 
      WasAnError: true, 
      Code: Codes.InternalServerError,
      Message: 'There was an untreated error on get backup data.', 
      Exception: JSON.stringify(err) 
    };
  }
}

export const generateGetPresignedUrl = async (event: any): Promise<Response<PresignedUrl>> => {
  try {
    if(!event.body)
      return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    if(event.body.length > 100_000)
      return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //! Parse request body
    const data: ImageInfo = JSON.parse(event.body);
    if(!data.fileName || !data.itemId) {
      return { WasAnError: true, Code: Codes.BadRequest, Message: 'Invalid request body.', };
    }

    //! Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (respAuth.WasAnError || !respAuth.Data)
      return { WasAnError: true, Code: respAuth.Code ?? Codes.Unauthorized, Message: respAuth.Message ?? 'Unauthorized', };

    // Generate pre-signed URL
    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const key = `uploads/${respAuth.Data.UserId}/${data.itemId}/${data.fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 60,
    };

    const downloadUrl = await s3.getSignedUrlPromise('getObject', params);

    //*Happy path
    return {
      WasAnError: false,
      Code: Codes.OK,
      Message: 'Pre-signed URL generated successfully.',
      Data: { url: downloadUrl },
    };
  } catch (err) {
    log.err('generateGetPresignedUrl', 'err', err);
    return {
      WasAnError: true,
      Code: Codes.InternalServerError,
      Message: 'An error occurred while generating the pre-signed URL.',
    };
  }
};

export const generatePutPresignedUrl = async (event: any): Promise<Response<PresignedUrl>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //! Parse request body
    const data: ImageInfo = JSON.parse(event.body);
    if(!data.fileName || !data.itemId || !data.fileType) {
      return {
        WasAnError: true,
        Code: Codes.BadRequest,
        Message: 'Invalid request body.',
      };
    }

    //! Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (respAuth.WasAnError || !respAuth.Data)
      return {
        WasAnError: true,
        Code: respAuth.Code ?? Codes.Unauthorized,
        Message: respAuth.Message ?? 'Unauthorized',
      };

    //! Generate pre-signed URL
    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const contentType = data.fileType || 'application/octet-stream';
    const key = `uploads/${respAuth.Data.UserId}/${data.itemId}/${data.fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 60,
      ContentType: contentType,
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    //* Happy path
    return {
      WasAnError: false,
      Code: Codes.OK,
      Message: 'Pre-signed URL generated successfully.',
      Data: { url: uploadUrl },
    };
  } catch (err) {
    log.err('generatePresignedUrl', 'err', err);
    return {
      WasAnError: true,
      Code: Codes.InternalServerError,
      Message: 'An error occurred while generating the pre-signed URL.',
    };
  }
};

export const generateDeletePresignedUrl = async (event: any): Promise<Response<PresignedUrl>> => {
  try {
    // if(!event.body)
    //   return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

    // if(event.body.length > 100_000)
    //   return {WasAnError: true, Code: Codes.PayloadTooLarge, Message: 'Request body too large.' } 
    
    //! Parse request body
    const data: ImageInfo = JSON.parse(event.body);
    if(!data.fileName || !data.itemId) {
      return {
        WasAnError: true,
        Code: Codes.BadRequest,
        Message: 'Invalid request body.',
      };
    }

    //! Unauthorized
    const respAuth = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (respAuth.WasAnError || !respAuth.Data){
      return {
        WasAnError: true,
        Code: respAuth.Code ?? Codes.Unauthorized,
        Message: respAuth.Message ?? 'Unauthorized',
      };
    }

    //! Generate pre-signed URL
    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const key = `uploads/${respAuth.Data.UserId}/${data.itemId}/${data.fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 60,
    };

    const deleteUrl = await s3.getSignedUrlPromise('deleteObject', params);

    //* Happy path
    return {
      WasAnError: false,
      Code: Codes.OK,
      Message: 'Pre-signed URL generated successfully.',
      Data: { url: deleteUrl },
    };
  } catch (err) {
    log.err('generatePresignedUrl', 'err', err);
    return {
      WasAnError: true,
      Code: Codes.InternalServerError,
      Message: 'An error occurred while generating the pre-signed URL.',
    };
  }
};

// export const getDeviceData = async (event: any): Promise<Response<DeviceData[]>> => {
//   try {
//     if(!event.body) return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

//     //!Parsing problem
//     const body: {DeviceId: string} = JSON.parse(event.body);
//     if(body.DeviceId === null || body.DeviceId === undefined) 
//       return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' }
//     //! Unauthorized
//     const respAuth = await validateToken(event, ['Admin']);
//     if (respAuth.WasAnError || !respAuth.Data){
//       return {
//         WasAnError: true,
//         Code: respAuth.Code ?? Codes.Unauthorized,
//         Message: respAuth.Message ?? 'Unauthorized',
//       };
//     }

//     //Database access
//     const respList = await db.getDeviceData(body.DeviceId);

//     if(respList.WasAnError)
//       return {...respList, Code: respList.Code?? Codes.InternalServerError, Message: 'There was an error trying to get device data.' };

//     //*Happy path
//     return {...respList, Code: respList.Code?? Codes.OK }
//   } catch (err) {
//     log.err('getDeviceData', 'err', err);
//     return {
//       WasAnError: true,
//       Code: Codes.InternalServerError,
//       Message: 'An error occurred while getting device data.',
//     };
//   }
// }

// export const postDeviceData = async (event: any): Promise<string> => {
//   try {
//     if(!event.body) return "400" 

//     //!Parsing problem
//     const data: DeviceData[] = JSON.parse(event.body);
//     if(!data) return "400";
    
//     if(data[0].UserId !== "MOBILEDEVICE" && data[0].UserId !== "STATIONARYDEVICE")
//       return "401"
    
//     //Database access
//     const respItem = await db.postDeviceData(data);
//     //*Happy path
//     return respItem;
//   } catch (err) {
//     return "500";
//   }
// }