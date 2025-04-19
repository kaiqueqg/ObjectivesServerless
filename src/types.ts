//------------------------- USER
export interface DBUser{
  UserId: string,
  Username: string,
  Password: string,
  Email: string,
  Status: string,
  Role: string,
}

//------------------------- TOKEN
export interface AuthenticationToken{
  JwtToken: string,
}

export interface DBToken{
  UserId: string,
  Token: string,
  Active: boolean,
}

//------------------------- REQUESTS

export interface Services{
  Name: string,
  Up: boolean,
  UpReason: string,
  RequestNewUserUp: boolean,
  RequestNewUserUpReason: string,
}

//------------------------- RESPONSE
export interface Response<T> {
  Data?: T,
  Message?: string,
  Exception?: string,
  WasAnError: boolean,
  Code?: number,
}

export const Codes = {
  OK: 200,
  Created: 201,
  Accepted: 202,
  NoContent: 204,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  InternalServerError: 500,
  ServiceUnavailable: 503,
}

//------------------------- LOG
export enum LogLevel { 
  Dev, 
  Warn, 
  Error, 
  None  
}

//------------------------- GROCERY LIST
export interface ObjectiveList{
  Objectives?: Objective[],
  Items?: Item[],
  DeleteObjectives?: Objective[],
  DeleteItems?: Item[],
}

export interface Objective {
  UserId: string,
  ObjectiveId: string,
  Title: string,
  Done: boolean,
  Theme: string,
  IsOpen: boolean,
  LastModified: string,
  Pos: number,
  IsShowingCheckedGrocery?: boolean,
  IsShowingCheckedStep?: boolean,
  IsShowingCheckedMedicine?: boolean,
  IsShowingCheckedExercise?: boolean,
  Tags: string[],
}

export interface DeviceData{
  UserId: string,
  DataId: string,
  DateAdded: string,
  AmbientTemperature: string,
  AmbientPressure: string,
  AmbientHumidity: string,
  AmbientLight: string,
  UVLight: string,
  IRTemperature: string,
  WeakProbTemperature: string,
  StrongProbTemperature: string,
  AirQuality: string,
  TotalAcel: string,
  AccX: string,
  AccY: string,
  AccZ: string,
  GyrX: string,
  GyrY: string,
  GyrZ: string,
  MagX: string,
  MagY: string,
  MagZ: string,
}

export interface ImageInfo {
  itemId: string;
  fileName: string;
}
export interface PresignedUrl { url: string }

export enum ItemType{ Step, Wait, Question, Note, Location, Divider, Grocery, Medicine, Exercise, Links, ItemFake, Image }

export interface Item {
  ItemId: string,
  UserIdObjectiveId: string,
  Type: ItemType,
  Pos: number,
  LastModified: string,
}

export interface Image extends Item{
  Title: string;
  Size: {X: number, Y: number};
  IsDisplaying: boolean;
  FileName: string;
  FileSize: number;
}