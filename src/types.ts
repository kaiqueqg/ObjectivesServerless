import { APIGatewayProxyResult } from "aws-lambda";

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
export interface AuthenticationRequest{
  JwtToken: string,
  RoleRequired: string[],
}

export interface AuthenticationResponse{
  Authorized: boolean,
  Message: string,
  User: DBUser|null,
}

export interface DBToken{
  UserId: string,
  Token: string,
  Active: boolean,
}

//------------------------- REQUESTS

export interface Service{
  Name: string,
  Up: boolean,
  UpReason: string,
  RequestNewUserUp: boolean,
  RequestNewUserUpReason: string,
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
  Conflict: 409,
  PayloadTooLarge: 413,
  InternalServerError: 500,
  NotImplemented: 501,
  ServiceUnavailable: 503,
};

export interface Response extends APIGatewayProxyResult {
}

export const DefaultResponse: Response = {
  statusCode: Codes.InternalServerError,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: '{}, message',
}
const CreateResponse = (statusCode:number, body: any, message?: string ): Response => {
  console.log('CreateResponse ' + statusCode + ' - ' + JSON.stringify(body));
  return {
    ...DefaultResponse,
    statusCode,
    body: JSON.stringify({
      data: body,
      message: message?? 'No information.'
    })
  }
}
export const Ok = (message?: string, body?: any) => {
  console.log('Ok - ' + JSON.stringify(body));
  return CreateResponse(Codes.OK, body ?? {}, message);
};

export const Created = (message?: string, body?: any) => {
  return CreateResponse(Codes.Created, body ?? {}, message);
};

export const Accepted = (message?: string, body?: any) => {
  return CreateResponse(Codes.Accepted, body ?? {}, message);
};

export const NoContent = (message?: string, body?: any) => {
  return CreateResponse(Codes.NoContent, body ?? {}, message);
};

export const BadRequest = (message?: string, body?: any) => {
  return CreateResponse(Codes.BadRequest, body ?? {}, message);
};

export const Unauthorized = (message?: string, body?: any) => {
  return CreateResponse(Codes.Unauthorized, body ?? {}, message);
};

export const Forbidden = (message?: string, body?: any) => {
  return CreateResponse(Codes.Forbidden, body ?? {}, message);
};

export const NotFound = (message?: string, body?: any) => {
  return CreateResponse(Codes.NotFound, body ?? {}, message);
};

export const Conflict = (message?: string, body?: any) => {
  return CreateResponse(Codes.Conflict, body ?? {}, message);
};

export const PayloadTooLarge = (message?: string, body?: any) => {
  return CreateResponse(Codes.PayloadTooLarge, body ?? {}, message);
};

export const InternalServerError = (message?: string, body?: any) => {
  return CreateResponse(Codes.InternalServerError, body ?? {}, message);
};

export const NotImplemented = (message?: string, body?: any) => {
  return CreateResponse(Codes.NotImplemented, body ?? {}, message);
};

export const ServiceUnavailable = (message?: string, body?: any) => {
  return CreateResponse(Codes.ServiceUnavailable, body ?? {}, message);
};

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
  IsArchived: boolean,
  IsLocked: boolean,
  LastModified: string,
  Pos: number,
  IsShowing: boolean,
  IsShowingCheckedGrocery?: boolean,
  IsShowingCheckedStep?: boolean,
  IsShowingCheckedMedicine?: boolean,
  IsShowingCheckedExercise?: boolean,
  Tags: string[],
}

export const DefaultObjective:Objective = {
  UserId: '',
  ObjectiveId: '',
  Title: '',
  Done: false,
  Theme: 'noTheme',
  IsArchived: false,
  IsLocked: false,
  LastModified: '',
  Pos: 0,
  IsShowing: true,
  IsShowingCheckedGrocery: true,
  IsShowingCheckedStep: true,
  IsShowingCheckedMedicine: true,
  IsShowingCheckedExercise: true,
  Tags: [],
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
  fileType: string;
}
export interface PresignedUrl { url: string }

export enum ItemType{ Step, Wait, Question, Note, Location, Divider, Grocery, Medicine, Exercise, Link, ItemFake, Image, House }

export interface Item {
  ItemId: string,
  UserIdObjectiveId: string,
  Type: ItemType,
  Pos: number,
  LastModified: string,
}

export const DefaultItem: Item = {
  ItemId: '',
  UserIdObjectiveId: '',
  Type: ItemType.Step,
  Pos: 0,
  LastModified: '',
}

export enum StepImportance {
  None,
  Low,
  Medium,
  High,
  Question,
  Waiting,
  InProgress,
  Ladybug,
  LadybugYellow,
  LadybugGreen,
}
export interface Step extends Item {
  Title: string,
  Done: boolean,
  Importance: StepImportance,
  AutoDestroy: boolean,
}

export const DefaultStep: Step = {
  ...DefaultItem,
  Title: '',
  Done: false,
  Importance: StepImportance.None,
  AutoDestroy: false,
}

export interface Wait extends Item {
  Title: string,
}

export const DefaultWait: Wait = {
  ...DefaultItem,
  Title: '',
}

export interface Note extends Item {
  Text: string,
}

export const DefaultNote: Note = {
  ...DefaultItem,
  Text: '',
}

export interface Question extends Item {
  Statement: string,
  Answer: string,
}

export const DefaultQuestion: Question = {
  ...DefaultItem,
  Statement: '',
  Answer: '',
}

export interface Location extends Item {
  Title: string,
  Url: string,
  IsShowingMap: boolean,
}

export const DefaultLocation: Location = {
  ...DefaultItem,
  Title: '',
  Url: '',
  IsShowingMap: false,
}

export interface Divider extends Item {
  Title: string,
  IsOpen: boolean,
}

export const DefaultDivider: Divider = {
  ...DefaultItem,
  Title: '',
  IsOpen: true,
}

export interface Grocery extends Item {
  Title: string,
  IsChecked: boolean,
  Quantity?: number,
  Unit?: string,
  GoodPrice?: string,
}

export const DefaultGrocery: Grocery = {
  ...DefaultItem,
  Title: '',
  IsChecked: false,
  Quantity: 0,
  Unit: '',
  GoodPrice: '',
}

export interface Medicine extends Item{
  Title: string,
  IsChecked: boolean,
  Quantity?: number,
  Unit?: string,
  Purpose?: string,
  Components?: string[],
}

export const DefaultMedicine: Medicine = {
  ...DefaultItem,
  Title: '',
  IsChecked: false,
  Quantity: 0,
  Unit: '',
  Purpose: '',
  Components: [],
}


export enum Weekdays{ Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday }

export interface Exercise extends Item{
  Title: string,
  IsDone: boolean,
  Reps: number,
  Series: number,
  MaxWeight: string,
  Description: string,
  Weekdays: Weekdays[],
  LastDone: string,
  BodyImages: string[],
}

export const DefaultExercise: Exercise = {
  ...DefaultItem,
  Title: '',
  IsDone: false,
  Reps: 0,
  Series: 0,
  MaxWeight: '',
  Description: '',
  Weekdays: [],
  LastDone: '',
  BodyImages: [],
}

export interface Link extends Item{
  Title: string,
  Link: string,
}

export const DefaultLink: Link = {
  ...DefaultItem,
  Title: '',
  Link: '',
}

export interface Image extends Item{
  Title: string;
  Name: string,
  Size: number,
  Width: number,
  Height: number,
  IsDisplaying: boolean;
}

export const DefaultImage: Image = {
  ...DefaultItem,
  Title: '',
  Name: '',
  Size: 0,
  Width: 0,
  Height: 0,
  IsDisplaying: true,
}

export interface House extends Item{
  Title: '',
  Listing: '',
  MapLink: '',
  MeterSquare: '',
  Rating: 0,
  Address: '',
  TotalPrice: 0,
  WasContacted: boolean,
  Details: '',
  Attention: '',
}

export const DefaultHouse: House = {
  ...DefaultItem,
  Title: '',
  Listing: '',
  MapLink: '',
  MeterSquare: '',
  Rating: 0,
  Address: '',
  TotalPrice: 0,
  WasContacted: false,
  Details: '',
  Attention: '',
}