import { APIGatewayProxyResult } from "aws-lambda";
import log from "./log";

//------------------------- USER
export interface DBUser{
  UserId: string,
  Username: string,
  Password: string,
  Email: string,
  Status: string,
  Role: string,
}

export enum UserRoles{
  Admin = 'Admin',
  Basic = 'Basic',
  Guest = 'Guest',
  EmailToken = 'EmailToken',
  TokenTester = 'TokenTester',
}

export enum UserStatus{
  Active = 'Active',
  WaitingApproval = 'WaitingApproval',
  Refused = 'Refused',
}

//------------------------- TOKEN
export interface AuthenticationRequest{
  JwtToken: string,
  RoleRequired: UserRoles[],
  StatusRequired: UserStatus[],
}

export interface AuthenticationResponse{
  Authorized: boolean,
  Message: string,
  User: DBUser|null,
  Error?: string,
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
const CreateResponse = (statusCode:number, body: any, message?: string, error?: string): Response => {
  log.dend('CreateResponse ' + statusCode + ' - ' + JSON.stringify(body));
  return {
    ...DefaultResponse,
    statusCode,
    body: JSON.stringify({
      data: body,
      message: message,
      error: error,
    })
  }
}
export const Ok = (message?: string, body?: any) => {
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

export const Unauthorized = (authResp: AuthenticationResponse) => {
  return CreateResponse(Codes.Unauthorized, {}, authResp.Message??'No message provided.', authResp.Error?? 'No error provided.');
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

//------------------------- Objectives and Items
export const isUserIDValid = (userId: string): boolean => {
  if(typeof userId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{40}$/.test(userId);
}

export const isObjectiveIDValid = (objectiveId: string): boolean => {
  if(typeof objectiveId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{40}$/.test(objectiveId);
}

export const isItemIDValid = (itemId: string): boolean => {
  if(typeof itemId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{40}$/.test(itemId);
}

export const isUserIdObjectiveIDValid = (userIdObjectiveId: string): boolean => {
  if(typeof userIdObjectiveId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{80}$/.test(userIdObjectiveId);
}

export const checkObjective = (o: Objective): Objective => {
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
  // const NumberToStringMap = [
  //   ItemType.Step,      // 0
  //   ItemType.Wait,      // 1
  //   ItemType.Question,  // 2
  //   ItemType.Note,      // 3
  //   ItemType.Location,  // 4
  //   ItemType.Divider,   // 5
  //   ItemType.Grocery,   // 6
  //   ItemType.Medicine,  // 7
  //   ItemType.Exercise,  // 8
  //   ItemType.Link,      // 9
  //   ItemType.ItemFake,  // 10
  //   ItemType.Image,     // 11
  //   ItemType.House      // 12
  // ];
  // const typeValue = (() => {
  //   if (typeof i.Type === 'string' && i.Type in ItemType) {
  //     return i.Type as ItemType;
  //   }

  //   if (typeof i.Type === 'number' && NumberToStringMap[i.Type]) {
  //     return NumberToStringMap[i.Type];
  //   }

  //   return ItemType.Note;
  // })();

  const base: Item = {
    ItemId: String(i.ItemId ?? ''),
    UserIdObjectiveId: String(i.UserIdObjectiveId ?? ''),
    Type: Number.isInteger(i.Type) ? i.Type : ItemType.Note,//typeValue,
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

    case ItemType.Link:
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

    case ItemType.House:
      return {
        ...base,
        Title: String((i as House).Title ?? ''),
        Listing: String((i as House).Listing ?? ''),
        MapLink: String((i as House).MapLink ?? ''),
        MeterSquare: String((i as House).MeterSquare ?? ''),
        Rating: Number((i as House).Rating ?? 0),
        Address: String((i as House).Address ?? ''),
        TotalPrice: Number((i as House).TotalPrice ?? 0),
        WasContacted: Boolean((i as House).WasContacted ?? false),
        Details: String((i as House).Details ?? ''),
        Attention: String((i as House).Attention ?? ''),
      } as House;

    case ItemType.ItemFake:
      return { ...base } as Item;

    default:
      return base;
  }
};

export interface ObjectivesList{
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
// export enum ItemType {
//   Step = 'Step',
//   Wait = 'Wait',
//   Question = 'Question',
//   Note = 'Note',
//   Location = 'Location',
//   Divider = 'Divider',
//   Grocery = 'Grocery',
//   Medicine = 'Medicine',
//   Exercise = 'Exercise',
//   Link = 'Link',
//   ItemFake = 'ItemFake',
//   Image = 'Image',
//   House = 'House'
// }

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