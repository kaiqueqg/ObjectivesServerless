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
  ObjectivesList,
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
  House,
  checkObjective,
  checkItem,
  UserRoles,
  UserStatus,
} from "./types";

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const MAX_REQUEST_SIZE = 100_000; // 100 KB
export const MAX_OBJECTIVES_PER_REQUEST = 100;
export const MAX_ITEMS_PER_REQUEST = 100;

/// Method responsible for calling authenticate lambda
const validateToken = async (event: APIGatewayProxyEvent, roles: UserRoles[] = [UserRoles.Basic], status: UserStatus[] = [UserStatus.Active]): Promise<AuthenticationResponse> => {
  log.d('validateToken - start - ', event)
  
  const authToken = event.headers.authorization;
  log.d('validateToken - ', authToken)

  if (authToken) {
    const token: AuthenticationRequest = {
      JwtToken: authToken.replace("Bearer ", ""),
      RoleRequired: roles,
      StatusRequired: status,
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

  return {Authorized: false, Message: 'Identity server failed to authenticate.', Error: 'ValidateTokenError', User: null};
};

export const isUpObjective = async (event: any) => {
  return Ok('Am I Alive?');
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

/// service - auth - OK
export const getObjectiveList = async (event: any): Promise<Response> => {
  try {
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

    const objList = await db.getObjectiveList(authUser.User.UserId);
    if(!objList) return InternalServerError("There was an untreated error on getObjectiveList.");

    return Ok('', objList);
  } catch (err) {
    return InternalServerError("There was an untreated error on getObjectiveList.");
  }
}

//! check isnt necessary
/// no body - type of body - max request size - try parse - type isnt right - service - auth - 500 - OK
export const getObjectiveItemList = async (event: any): Promise<Response> => {
  try {
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.');

    let rawObj: {ObjectiveId: string} = {ObjectiveId: ''};
    try {
      const result:{ObjectiveId: string} = JSON.parse(event.body);
      rawObj.ObjectiveId = result.ObjectiveId;
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.')
    }

    if(!rawObj.ObjectiveId || rawObj.ObjectiveId.trim() === '')
      return BadRequest('There was an problem with the body of request.');

    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

    const objItemList = await db.getObjectiveItemList(authUser.User.UserId + rawObj.ObjectiveId);
    if(!objItemList) return InternalServerError("There was an untreated error on getObjectiveItemList.");
    
    return Ok('', objItemList);
  } catch (err) {
    log.err('getObjectiveItemList', 'err', err);
    return InternalServerError("There was an untreated error on getObjectiveItemList.");
  }
}

/// no body - type of body - max request size - try parse - type isnt right - service - auth - 500 - OK
export const getObjective = async (event: any): Promise<Response> => {
  try {
    log.d('getObjective - ', event)
    if(!event.body || typeof event.body !== 'string') return BadRequest('There was an problem with the body of request.');
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.');

    let rawObj: {ObjectiveId: string} = {ObjectiveId: ''};
    try {
      const result = JSON.parse(event.body);
      rawObj.ObjectiveId = result.ObjectiveId;
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.');
    }
    if(!rawObj.ObjectiveId || rawObj.ObjectiveId.trim() === '') return BadRequest('There was an problem with the body of request.');
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    log.d('getObjective - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);
    
    const objective = await db.getObjective(authUser.User.UserId, rawObj.ObjectiveId);
    log.d('getObjective - objective - ', objective)
    if(!objective) return InternalServerError("There was an untreated error on getObjective.");

    log.d('getObjective - ok')
    return Ok('', objective);
  } catch (err) {
    log.err('getObjective', 'err', err);
    return InternalServerError("There was an untreated error on getObjective.");
  }
}
/// no body - type of body - max request size - try parse - type isnt right - !max length - service - auth - check - 500 - ok
export const putObjectives = async (event: any): Promise<Response> => {
  try {
    if(!event.body || typeof event.body !== 'string') return BadRequest('There was an problem with the body of request.');
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.'); 
    
    let rawObj: unknown;
    try {
      rawObj = JSON.parse(event.body);
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.');
    }

    if (!Array.isArray(rawObj)) return BadRequest('Request body must be an array of objectives.');
    if (rawObj.length > MAX_OBJECTIVES_PER_REQUEST) return BadRequest(`Too many objectives. Max allowed is ${MAX_OBJECTIVES_PER_REQUEST}.`);
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

    let checkedObjs:Objective[] = []
    for (let i = 0; i < rawObj.length; i++) {
      let o = rawObj[i];
      checkedObjs.push(checkObjective(o))
    }

    const obj = await db.putObjectives(authUser.User.UserId, checkedObjs);
    if(!obj) return InternalServerError('There was an untreated error on putObjectives.');

    return Ok('', checkedObjs);
  } catch (err) {
    log.err('putObjectives', 'err', err);
    return InternalServerError('There was an untreated error on putObjectives.');
  }
}
/// no body - type of body - try parse - type isnt right - !max length - service - auth - check - 500 - ok
export const deleteObjectives = async (event: any): Promise<Response> => {
  try {
    log.d('deleteObjectives - ', event)
    if(!event.body || typeof event.body !== 'string') return BadRequest('There was an problem with the body of request.');
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.'); 
    
    let rawObj: Objective[] = [];
    try {
      rawObj = JSON.parse(event.body);
      log.d('deleteObjectives - rawObj - ', rawObj)
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.');
    }
    if(!rawObj) return BadRequest('There was an problem with the body of request.');

    if (!Array.isArray(rawObj)) return BadRequest('Request body must be an array of objectives.');
    if (rawObj.length > MAX_OBJECTIVES_PER_REQUEST) return BadRequest(`Too many objectives. Max allowed is ${MAX_OBJECTIVES_PER_REQUEST}.`);
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.TokenTester]);
    log.d('deleteObjectives - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

    const obj = await db.deleteObjectives(authUser.User.UserId, rawObj);
    log.d('deleteObjectives - obj - ', obj)
    if(!obj) return InternalServerError('There was an untreated error on deleteObjective.');

    log.d('deleteObjectives - ok')
    return Ok('', rawObj);
  } catch (err) {
    log.err('deleteObjective', 'err', err);
    return InternalServerError('There was an untreated error on deleteObjective.');
  }
}

/// no body - type of body - max request size - try parse - type isnt right - service - auth - UserId from DB - 500 - OK
export const getObjectiveItem = async (event: any): Promise<Response> => {
  try {
    log.d('getObjectiveItem - ', event)
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.'); 
    
    const rawItem: {UserIdObjectiveId: string, ItemId: string} = { UserIdObjectiveId: '', ItemId: ''};
    try {
      const result = JSON.parse(event.body);
      rawItem.UserIdObjectiveId = result.UserIdObjectiveId;
      rawItem.ItemId = result.ItemId;
      log.d('getObjectiveItem - rawItem - ', event);
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.');
    }
    if(!rawItem) return BadRequest('There was an problem with the body of request.');
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    log.d('getObjectiveItem - authUser - ', event)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

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
/// no body - type of body - max request size - try parse - type isnt right - !max length - service - auth - check - 500 - ok
export const putObjectiveItems = async (event: any): Promise<Response> => {
  try {
    log.d('putObjectiveItems - event.body - ', event.body);
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    log.d('putObjectiveItems - event.body - ', event.body);
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.'); 

    let rawItems: Item[] = [];
    try {
      rawItems = JSON.parse(event.body);
      log.d('putObjectiveItems - rawItems - ', rawItems);
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.');
    }
    if(!rawItems) return BadRequest('There was an problem with the body of request.');
    
    if (!Array.isArray(rawItems)) return BadRequest('Request body must be an array of items.');
    if (rawItems.length > MAX_ITEMS_PER_REQUEST) return BadRequest(`Too many items. Max allowed is ${MAX_ITEMS_PER_REQUEST}.`);

    const service = await db.getService();
    log.d('putObjectiveItems - service - ', service);
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    log.d('putObjectiveItems - authUser - ', authUser);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);
    
    let checkedItems:Item[] = []
    for (let i = 0; i < rawItems.length; i++) {
      let e = rawItems[i];
      checkedItems.push(checkItem(e))
    }
    log.d('putObjectiveItems - checkedItems - ', checkedItems);

    const item = await db.putObjectiveItems(authUser.User.UserId, checkedItems);
    log.d('putObjectiveItems - item - ', item);
    if(!item) return InternalServerError('There was an untreated error on putObjectiveItem.');
    log.d('putObjectiveItems - checkedItems - ', checkedItems);

    return Ok('', checkedItems);
  } catch (err) {
    log.err('putObjectiveItems', 'err', err);
    return InternalServerError('There was an untreated error on putObjectiveItem.');
  }
}
/// no body - type of body - try parse - type isnt right - !max length - service - auth - check - 500 - ok
export const deleteObjectiveItems = async (event: any) => {
  try {
    // log.d('deleteObjectiveItem - ', event)
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.'); 

    let rawItems: Item[] = [];
    try {
      log.d('deleteObjectiveItem - rawItems - ', rawItems)
      rawItems = JSON.parse(event.body);
    } catch (err) {
      log.err(err);
      return BadRequest('There was an problem parsing the body of request.');
    }
    if(!rawItems) return BadRequest('There was an problem with the body of request.');
    
    if (!Array.isArray(rawItems)) return BadRequest('Request body must be an array of items.');
    if (rawItems.length > MAX_ITEMS_PER_REQUEST) return BadRequest(`Too many items. Max allowed is ${MAX_ITEMS_PER_REQUEST}.`);

    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.TokenTester]);
    // log.d('deleteObjectiveItem - authUser - ', authUser)
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);
    
    const items = await db.deleteObjectiveItems(authUser.User.UserId, rawItems);
    // log.d('deleteObjectiveItem - items - ', items)
    if(!items) return InternalServerError('There was an untreated error on deleteObjectiveItem.');

    // log.d('deleteObjectiveItem - ok')
    return Ok('', items);
  } catch (err) {
    log.err('deleteObjectiveItem', 'err', err);
    return InternalServerError('There was an untreated error on deleteObjectiveItem.');
  }
}
export const syncObjectivesList = async (event: any): Promise<Response> => {
  try {
    /// Does the body exist?
    log.d('syncObjectivesList - event.body - ', event.body);
    if(!event.body || typeof event.body !== 'string')return BadRequest('There was an problem with the body of request.');

    /// Is body too big?
    log.d('syncObjectivesList - event.body2 - ', event.body);
    if(event.body.length > MAX_REQUEST_SIZE) return PayloadTooLarge('Request body too large.'); 
    
    /// Can I Parse the body?
    const objectivesList: ObjectivesList = JSON.parse(event.body);
    log.d('syncObjectivesList - objectivesList - ', objectivesList);
    if(!objectivesList) return BadRequest('There was an problem with the body of request.');
    
    /// Is the service available?
    const service = await db.getService();
    log.d('syncObjectivesList - service - ', service);
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);
    
    /// Is authorized?
    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest, UserRoles.TokenTester]);
    log.d('syncObjectivesList - authUser - ', authUser);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

    /// Delete images if necessary 
    //! For now doing nothing
    ///Delete images in deleted Items
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

    /// Does the actual syncing
    const syncList = await db.syncObjectivesList(authUser.User.UserId, objectivesList, authUser.User.Role === UserRoles.Guest);
    log.d('syncObjectivesList - syncList - ', syncList);
    if(!syncList) return InternalServerError('There was an untreated error on syncGroceryList.');

    log.dend('syncObjectivesList - ok')
    return Ok('', syncList);
  } catch (err) {
    log.err('syncGroceryList', 'err', err);
    return InternalServerError('There was an untreated error on syncGroceryList.');
  }
}

export const backupData = async (event: any): Promise<Response> => {
  try {
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin, UserRoles.Guest]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

    const empty: ObjectivesList = {DeleteItems: [], DeleteObjectives: [], Items: [], Objectives:[]};
    const syncList = await db.syncObjectivesList(authUser.User.UserId, empty, authUser.User.Role === UserRoles.Guest);

    const now = new Date().toISOString();
    const params = {
      Bucket: process.env.BK_OBJECTIVE_BACKUP_BUCKET_NAME || '',
      Key: `${authUser.User.UserId}/backup/${now}.json`,
      Body: JSON.stringify(syncList, null, 2),
      ContentType: "application/json"
    };

    await s3.putObject(params).promise();
    return Ok('Backup done', {success: true});
  } catch (err) {
    log.err('backupData', 'err', err);
    return InternalServerError('There was an untreated error on backupData.');
  }
}

export const getBackupDataList = async (event: any): Promise<Response> => {
  try {
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

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
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

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
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

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
    
    const service = await db.getService();
    if (!service || !service.Up) return ServiceUnavailable('Objectives service server unavailable: ' + service?.UpReason);

    const authUser = await validateToken(event, [UserRoles.Basic, UserRoles.Admin]);
    if (!authUser || !authUser.User || !authUser.Authorized) return Unauthorized(authUser);

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
//     const respAuth = await validateToken(event, [UserRoles.Admin]);
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