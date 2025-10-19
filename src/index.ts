import log from "./log";
import AWS from 'aws-sdk';
import db from "./dynamodbService";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  // Core types
  Codes,
  Response,
  AuthenticationRequest,
  AuthenticationResponse,

  // Database models
  DBUser,
  DBToken,
  Service,
  Objective,
  Item,
  ObjectiveList,
  DeviceData,

  // Media & Files
  PresignedUrl,
  ImageInfo,
  Image,

  // Domain entities
  ItemType,
  Exercise,
  Medicine,
  Grocery,
  Divider,
  Question,
  Note,
  Wait,
  Step,
  StepImportance,
  Link,
  Location,

  // Default responses
  Ok,
  BadRequest,
  Unauthorized,
  Forbidden,
  Conflict,
  InternalServerError,
  ServiceUnavailable,
  PayloadTooLarge,
} from "./types";

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();


// Method responsible for calling authenticate lambda
const validateToken = async (event: APIGatewayProxyEvent, role: string[] = ["Basic"]): Promise<AuthenticationResponse|null> => {
  log.d('validateToken - start - ', event)
  
  const authToken = event.headers.authorization;
  log.d('validateToken - ', authToken)

  if (authToken) {
    const token: AuthenticationRequest = {
      JwtToken: authToken.replace("Bearer ", ""),
      RoleRequired: role,
    };

    log.d('validateToken - ', token)
    const params = {
      FunctionName: "AuthenticateFunction",
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(token),
    };

    const data = await lambda.invoke(params).promise();
    log.d('validateToken - ', data)
    const payload = JSON.parse(data.Payload as string);
    log.d('validateToken - ', payload)
    const authUserResponse: AuthenticationResponse = typeof payload === "string" ? JSON.parse(payload) : payload;

    log.d('validateToken - ', authUserResponse)

    return authUserResponse;
  }

  return null;
};

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

const checkItem = (i: Item): Item => {
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

export const getObjectiveList = async (event: any): Promise<Response> => {
  try {
    log.d('getObjectiveList - ', event)
    const service = await db.getService();
    log.d('getObjectiveList - service - ', service)
    if (!service || !service.Up) return ServiceUnavailable('Identity server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('getObjectiveList - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const objList = await db.getObjectiveList(authUser.User.UserId);
    log.d('getObjectiveList - objList - ', objList)
    if(!objList) return InternalServerError("There was an untreated error on getObjectiveList.");

    log.d('getObjectiveList - ok')
    return Ok('', objList);
  } catch (err) {
    return InternalServerError("There was an untreated error on getObjectiveList.");
  }
}
export const getObjectiveItemList = async (event: any): Promise<Response> => {
  try {
    log.d('getObjectiveItemList - ', event)
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.');

    const objectiveId: {ObjectiveId: string} = JSON.parse(event.body);
    if(!objectiveId.ObjectiveId || objectiveId.ObjectiveId.trim() === '')
      return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('getObjectiveItemList - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const objItemList = await db.getObjectiveItemList(authUser.User.UserId + objectiveId.ObjectiveId);
    log.d('getObjectiveItemList - objItemList - ', objItemList)
    if(!objItemList) return InternalServerError("There was an untreated error on getObjectiveItemList.");
    
    log.d('getObjectiveItemList - ok')
    return Ok('', objItemList);
  } catch (err) {
    log.err('getObjectiveItemList', 'err', err);
    return InternalServerError("There was an untreated error on getObjectiveItemList.");
  }
}
export const getObjective = async (event: any): Promise<Response> => {
  try {
    log.d('getObjective - ', event)
    if(!event.body || typeof event.body !== 'string') return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.');

    const body: {ObjectiveId: string} = JSON.parse(event.body);
    if(!body.ObjectiveId || body.ObjectiveId.trim() === '') return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('getObjective - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);
    
    const objective = await db.getObjective(authUser.User.UserId, body.ObjectiveId);
    log.d('getObjective - objective - ', objective)
    if(!objective) return InternalServerError("There was an untreated error on getObjective.");

    log.d('getObjective - ok')
    return Ok('', objective);
  } catch (err) {
    log.err('getObjective', 'err', err);
    return InternalServerError("There was an untreated error on getObjective.");
  }
}
export const putObjectives = async (event: any): Promise<Response> => {
  try {
    log.d('putObjectives - ', event)
    if(!event.body || typeof event.body !== 'string' || typeof event.body !== 'string') return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 
    
    const rawObj: Objective[] = JSON.parse(event.body);
    if(!rawObj) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('putObjectives - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    let checkedObjs:Objective[] = []
    for (let i = 0; i < rawObj.length; i++) {
      let o = rawObj[i];
      checkedObjs.push(checkObjective(o))
    }
    log.d('putObjectives - checkedObjs - ', checkedObjs)

    const obj = await db.putObjectives(authUser.User.UserId, checkedObjs);
    log.d('putObjectives - obj - ', obj)
    if(!obj) return InternalServerError('There was an untreated error on putObjectives.');

    log.d('putObjectives - ok')
    return Ok('', checkedObjs);
  } catch (err) {
    log.err('putObjectives', 'err', err);
    return InternalServerError('There was an untreated error on putObjectives.');
  }
}
export const deleteObjectives = async (event: any): Promise<Response> => {
  try {
    log.d('deleteObjectives - ', event)
    if(!event.body || typeof event.body !== 'string') return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 
    
    const rawObj: Objective[] = JSON.parse(event.body);
    log.d('deleteObjectives - rawObj - ', rawObj)
    if(!rawObj) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('deleteObjectives - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const obj = await db.deleteObjectives(authUser.User.UserId, rawObj);
    log.d('deleteObjectives - obj - ', obj)
    if(!obj) return InternalServerError('There was an untreated error on deleteObjective.');

    log.d('deleteObjectives - ok')
    return Ok('', obj);
  } catch (err) {
    log.err('deleteObjective', 'err', err);
    return InternalServerError('There was an untreated error on deleteObjective.');
  }
}

export const getObjectiveItem = async (event: any): Promise<Response> => {
  try {
    log.d('getObjectiveItem - ', event)
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 
    
    const rawItem: {UserIdObjectiveId: string, ItemId: string} = JSON.parse(event.body);
    log.d('getObjectiveItem - rawItem - ', event)
    if(!rawItem) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('getObjectiveItem - authUser - ', event)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    rawItem.UserIdObjectiveId = authUser.User.UserId + ((rawItem.UserIdObjectiveId.length > 40) ? rawItem.UserIdObjectiveId.slice(-40) : rawItem.UserIdObjectiveId);
    const item = await db.getObjectiveItem(authUser.User.UserId + rawItem.UserIdObjectiveId, rawItem.ItemId);
    log.d('getObjectiveItem - item - ', item)
    if(!item) return InternalServerError('There was an untreated error on getObjectiveItem.');

    log.d('getObjectiveItem - ok')
    return Ok('', item);
  } catch (err) {
    log.err('getObjectiveItem', 'err', err);
    return InternalServerError('There was an untreated error on getObjectiveItem.');
  }
}
export const putObjectiveItems = async (event: any): Promise<Response> => {
  try {
    log.d('putObjectiveItems - ', event)
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 

    const rawItems: Item[] = JSON.parse(event.body);
    log.d('putObjectiveItems - rawItems - ', rawItems)
    if(!rawItems) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('putObjectiveItems - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);
    
    let checkedItems:Item[] = []
    for (let i = 0; i < rawItems.length; i++) {
      let e = rawItems[i];
      checkedItems.push(checkItem(e))
    }
    log.d('putObjectiveItems - checkedItems - ', checkedItems)

    const item = await db.putObjectiveItems(authUser.User.UserId, checkedItems);
    log.d('putObjectiveItems - item - ', item)
    if(!item) return InternalServerError('There was an untreated error on putObjectiveItem.');

    log.d('putObjectiveItems - ok')
    return Ok('', checkedItems);
  } catch (err) {
    log.err('putObjectiveItems', 'err', err);
    return InternalServerError('There was an untreated error on putObjectiveItem.');
  }
}
export const deleteObjectiveItem = async (event: any) => {
  try {
    log.d('deleteObjectiveItem - ', event)
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 

    const rawItem: Item = JSON.parse(event.body);
    log.d('deleteObjectiveItem - rawItem - ', rawItem)
    if(!rawItem) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('deleteObjectiveItem - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);
    
    const item = await db.deleteObjectiveItems(authUser.User.UserId, [rawItem]);
    log.d('deleteObjectiveItem - item - ', item)
    if(!item) return InternalServerError('There was an untreated error on deleteObjectiveItem.');

    log.d('deleteObjectiveItem - ok')
    return Ok();
  } catch (err) {
    log.err('deleteObjectiveItem', 'err', err);
    return InternalServerError('There was an untreated error on deleteObjectiveItem.');
  }
}
export const syncObjectivesList = async (event: any): Promise<Response> => {
  try {
    log.d('syncObjectivesList')
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 
    log.d('syncObjectivesList 1')
    
    const objectivesList: ObjectiveList = JSON.parse(event.body);
    if(!objectivesList) return BadRequest('There was an problem with the body of request.');
    log.d('syncObjectivesList 2')
    
    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    log.d('syncObjectivesList 3 - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

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
    log.d('syncObjectivesList 4')

    const syncList = await db.syncObjectivesList(authUser.User.UserId, objectivesList);

    log.d('syncObjectivesList 5')
    if(!syncList) return InternalServerError('There was an untreated error on syncGroceryList.');
    log.d('syncObjectivesList 6')

    return Ok('', syncList);
  } catch (err) {
    log.err('syncGroceryList', 'err', err);
    return InternalServerError('There was an untreated error on syncGroceryList.');
  }
}

export const backupData = async (event: any): Promise<Response> => {
  try {
    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const empty: ObjectiveList = {DeleteItems: [], DeleteObjectives: [], Items: [], Objectives:[]};
    const syncList = await db.syncObjectivesList(authUser.User.UserId, empty);

    const now = new Date().toISOString();
    const params = {
      Bucket: process.env.BK_OBJECTIVE_BACKUP_BUCKET_NAME || '',
      Key: `${authUser.User.UserId}/backup/${now}.json`,
      Body: JSON.stringify(syncList, null, 2),
      ContentType: "application/json"
    };

    await s3.putObject(params).promise();
    return Ok();
  } catch (err) {
    log.err('backupData', 'err', err);
    return InternalServerError('There was an untreated error on backupData.');
  }
}

export const getBackupDataList = async (event: any): Promise<Response> => {
  try {
    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const listResponse = await s3.listObjectsV2({
      Bucket: process.env.BK_OBJECTIVE_BACKUP_BUCKET_NAME || '',
      Prefix: `${authUser.User.UserId}/backup/`
    }).promise();
    
    const fileNames: string[] = (listResponse.Contents ?? [])
      .map(obj => obj.Key?.split("/").pop() ?? "")
      .filter(name => name.length > 0); // Remove empty values (if any)

    return Ok(JSON.stringify(fileNames));
  } catch (err) {
    log.err('getBackupDataList', 'err', err);
    return InternalServerError('There was an untreated error on getBackupDataList.');
  }
}

export const generateGetPresignedUrl = async (event: any): Promise<Response> => {
  try {
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 

    const data: ImageInfo = JSON.parse(event.body);
    if(!data) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const key = `uploads/${authUser.User.UserId}/${data.itemId}/${data.fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 60,
    };

    const downloadUrl = await s3.getSignedUrlPromise('getObject', params);

    return Ok('', { url: downloadUrl });
  } catch (err) {
    log.err('generateGetPresignedUrl', 'err', err);
    return InternalServerError('There was an untreated error on generateGetPresignedUrl.');
  }
};

export const generatePutPresignedUrl = async (event: any): Promise<Response> => {
  try {
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 

    const data: ImageInfo = JSON.parse(event.body);
    if(!data) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const contentType = data.fileType || 'application/octet-stream';
    const key = `uploads/${authUser.User.UserId}/${data.itemId}/${data.fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 60,
      ContentType: contentType,
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    //* Happy path
    return Ok('', { url: uploadUrl });
  } catch (err) {
    log.err('generatePresignedUrl', 'err', err);
    return InternalServerError('There was an untreated error on generatePutPresignedUrl.');
  }
};

export const generateDeletePresignedUrl = async (event: any): Promise<Response> => {
  try {
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > 100_000) return PayloadTooLarge('Request body too large.'); 

    const data: ImageInfo = JSON.parse(event.body);
    if(!data) return BadRequest('There was an problem with the body of request.');

    const authUser = await validateToken(event, ['Basic', 'Admin', 'Guest']);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser?.Message);

    const bucketName = process.env.BK_OBJECTIVE_IMAGE_BUCKET_NAME ||'';
    const key = `uploads/${authUser.User.UserId}/${data.itemId}/${data.fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 60,
    };

    const deleteUrl = await s3.getSignedUrlPromise('deleteObject', params);

    return Ok('', { url: deleteUrl });
  } catch (err) {
    log.err('generatePresignedUrl', 'err', err);
    return InternalServerError('There was an untreated error on generatePresignedUrl.');
  }
};

// export const getDeviceData = async (event: any): Promise<Response<DeviceData[]>> => {
//   try {
//     if(!event.body || typeof event.body !== 'string') return {WasAnError: true, Code: Codes.BadRequest, Message: 'There was an problem with the body of request.' } 

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
//     if(!event.body || typeof event.body !== 'string') return "400" 

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