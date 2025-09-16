namespace Zdashboard;

using {
  Country,
  sap.common.CodeList as CodeList,
  cuid,
  // User,
  Language,
  managed,
  Currency,
} from '@sap/cds/common';
using {
  sap.common.Region,
  sap.common.UnitOfMeasure,
  sap.common.Criticality
} from './common';


entity Users {
  key Id   : String;
      Name : String;
  toFiles  : association to many FileUsers on toFiles.UserId = Id;
}

entity Files {
  key Id          : UUID;
      Title       : String(100);
      ModifiedAt  : DateTime;
      ModifiedBy  : String(12);
  toUsers         : association to many FileUsers on toUsers.FileId = Id;
}

entity FileUsers {
  key FileId : UUID;
  key UserId : String(12);
      Level  : String(1);
  toFile     : association to Files   on toFile.Id = FileId;
  toUser     : association to Users   on toUser.Id = UserId;
  toLevel    : association to Levels   on toLevel.Id = Level;
}

entity Levels {
  key Id    : String(1);
      Title : String(100);
}

entity Contacts {
  key Email      : String(50);
      Type       : String(1);
      Job        : String(50);
      Name       : String(50);
      Phone      : String(50);
      Username   : String(12);
      ChangeDate : DateTime;
      ChangeTime : Time;
  ContactType    : association to ContactTypes on ContactType.Id = Type;
}

entity ContactTypes {
  key Id    : String(1);
      Title : String;
}

entity Segments {
  key Id          : String(3);
      Title       : String(50);
      Description : String(250);
      Username    : String(12);
      ChangeDate  : DateTime;
      ChangeTime  : Time;
}
