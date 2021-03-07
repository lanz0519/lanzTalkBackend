const classConfigObject = {};
module.exports = { initParse, generateBeforeSaveTrigger };

async function initParse() {
  const BLACKLIST = ["_Session"];

  const allClass = await Parse.Schema.all();
  const classNameList = [];
  for (const oneClass of allClass) {
    if (!BLACKLIST.includes(oneClass.className)) {
      classNameList.push(oneClass.className);
    }
  }
  // console.log(classNameList)
  const classConfigList = await new Parse.Query("ClassConfig").find();
  // console.log(classConfigList)
  for (const classConfig of classConfigList) {
    const classConfigJson = classConfig.toJSON();
    if (classConfigJson.name.startsWith("_")) {
      classConfigJson.name = classConfigJson.name.substring(1);
    }
    classConfigObject[classConfigJson.name] = classConfigJson;
  }
  // console.log(classConfigList)

  Parse.Cloud.afterSave("ClassConfig", async (req) => {
    // console.log('====afterSave',req.object.toJSON());
    const classConfigJson = req.object.toJSON();
    if (classConfigJson.name.startsWith("_")) {
      classConfigJson.name = classConfigJson.name.substring(1);
    }
    classConfigObject[classConfigJson.name] = classConfigJson;
  });

  for (const className of classNameList) {
    await generateBeforeSaveTrigger(className);
  }
  await initRole(classNameList);
}

async function initRole(classNameList) {
  const baseRoleList = await new Parse.Query(Parse.Role)
    .startsWith("name", "_")
    .find({ useMasterKey: true });
  const baseRoleNameList = [];
  for (const baseRole of baseRoleList) {
    baseRoleNameList.push(baseRole.get("name"));
  }

  for (const className of classNameList) {
    let classNameCopy = className;
    if (classNameCopy.startsWith("_")) {
      classNameCopy = classNameCopy.substring(1);
    }

    if (!baseRoleNameList.includes(`_${classNameCopy}_Read`)) {
      await new Parse.Role(`_${classNameCopy}_Read`, new Parse.ACL()).save({
        useMasterKey: true,
      });
    }
    if (!baseRoleNameList.includes(`_${classNameCopy}_Write`)) {
      await new Parse.Role(`_${classNameCopy}_Write`, new Parse.ACL()).save({
        useMasterKey: true,
      });
    }
  }
}

async function generateBeforeSaveTrigger(className, func) {
  // console.log('====className', className);
  Parse.Cloud.beforeSave(className, async (req) => {
    // console.log('====req', req);
    // console.log('====req.object.toJSON()', req.object.toJSON());
    const READABLE = 1;
    const WRITEABLE = 2;
    // console.log('====className',className);
    if (className.startsWith("_")) {
      className = className.substring(1);
    }
    const { ACLConfig, createProtectedFields, updateProtectedFields } =
      classConfigObject[className] || {};
    // console.log('===className', className)
    // console.log('===classConfigObject', classConfigObject)
    // console.log('===ACLConfig', ACLConfig)
    // console.log('====updateProtectedFields', updateProtectedFields)
    // console.log('====createProtectedFields', createProtectedFields)
    const userTokens = ["*"];
    if (req.user) {
      userTokens.push(req.user.id);
      userTokens.push("authenticated");
    }
    const roles = await new Parse.Query(Parse.Role)
      .equalTo("users", req.user)
      .find({ useMasterKey: true });
    for (const role of roles) {
      userTokens.push(`role:${role.get("name")}`);
    }
    // console.log('=====userToskens', userTokens)

    if (!req.original) {
      if (createProtectedFields && !req.master) {
        if (
          !vailateCreateProtectedFields(
            userTokens,
            createProtectedFields,
            req.object.toJSON()
          )
        ) {
          throw new Error("当前用户禁止创建该列数据");
        }
      }

      const ACL = new Parse.ACL();
      // if (className.startsWith('_')) {
      //     className = className.substring(1)
      // }
      ACL.setRoleReadAccess(`_${className}_Read`, true);
      ACL.setRoleWriteAccess(`_${className}_Write`, true);
      

      // 适配型
      if (ACLConfig) {
        // console.log(ACLConfig)
        for (let ACLK in ACLConfig) {
          // console.log(ACLConfig[ACLK])
          if (ACLK === "friend") {
            // 好友关系相关者可读写
            // console.log(req.object.get("user1").id);
            ACL.setReadAccess(req.object.get("user1").id, !!(ACLConfig[ACLK] & READABLE));
            ACL.setWriteAccess(req.object.get("user1").id, !!(ACLConfig[ACLK] & WRITEABLE));
            ACL.setReadAccess(req.object.get("user2").id, !!(ACLConfig[ACLK] & READABLE));
            ACL.setWriteAccess(req.object.get("user2").id, !!(ACLConfig[ACLK] & WRITEABLE));
          }
          // 判断是私聊还是服务器的群聊
          if (ACLK === "record") {
            // console.log(req.object.get("ifServer"))
            if (req.object.get("ifServer")) {
              // 服务器聊天记录所有人可读
              ACL.setPublicReadAccess(!!(ACLConfig[ACLK] & READABLE));
            } else {
              // 私聊相关人员可读
              ACL.setReadAccess(req.object.get("sender").id, !!(ACLConfig[ACLK] & READABLE));
              ACL.setReadAccess(req.object.get("receiver").id, !!(ACLConfig[ACLK] & READABLE));
            }
          }
          if (ACLK === "public") {
            ACL.setPublicReadAccess(!!(ACLConfig[ACLK] & READABLE));
            ACL.setPublicWriteAccess(!!(ACLConfig[ACLK] & WRITEABLE));
          }
          if (ACLK === "owner" && req.user) {
            ACL.setReadAccess(req.user.id, !!(ACLConfig[ACLK] & READABLE));
            ACL.setWriteAccess(req.user.id, !!(ACLConfig[ACLK] & WRITEABLE));
          }
          if (ACLK.startsWith("role:")) {
            const roleName = ACLK.substring(5);
            ACL.setRoleReadAccess(roleName, !!(ACLConfig[ACLK] & READABLE));
            ACL.setRoleWriteAccess(roleName, !!(ACLConfig[ACLK] & WRITEABLE));
          }
          if (ACLK.startsWith("userField:")) {
            const columnName = ACLK.substring(10);
            if (req.object && req.object.get(columnName)) {
              ACL.setReadAccess(
                req.object.get(columnName).id,
                !!(ACLConfig[ACLK] & READABLE)
              );
              ACL.setWriteAccess(
                req.object.get(columnName).id,
                !!(ACLConfig[ACLK] & WRITEABLE)
              );
            }
          }
        }
      }
      // console.log(ACL)
      // 适配型End
      req.object.setACL(ACL);
    } else {
      if (updateProtectedFields && !req.master) {
        const originalData = req.original.toJSON();
        const editObjectData = findDifferentObjectData(
          originalData,
          req.object.toJSON()
        );
        // console.log('====req.original',req.original.toJSON())
        // console.log('====req.object',req.object.toJSON())
        // console.log('====editObjectData',editObjectData)
        if (
          !vailateUpdateProtectedFields(
            userTokens,
            updateProtectedFields,
            editObjectData,
            originalData
          )
        ) {
          throw new Error("当前用户禁止修改该列数据");
        }
      }
    }

    if (func && typeof func === "function") {
      func(req);
    }
  });
}

function vailateCreateProtectedFields(
  userTokens = [],
  createProtectedFields = {},
  objectData = {}
) {
  let createProtectedFieldsIntersection;
  for (const CPFK in createProtectedFields) {
    if (Object.prototype.hasOwnProperty.call(createProtectedFields, CPFK)) {
      let userToken = CPFK;
      if (userToken.startsWith("userField:")) {
        const columnName = CPFK.substring(10);
        userToken = (objectData[columnName] || {}).objectId; // userID
        // //console.log('CPFK', CPFK, this.data[columnName], columnName)
      }
      // console.log('====userToken',userToken,userTokens)
      if (userTokens.includes(userToken)) {
        if (!createProtectedFieldsIntersection) {
          createProtectedFieldsIntersection = createProtectedFields[CPFK];
        }
        // console.log('====FFFFcreateProtectedFieldsIntersection',createProtectedFieldsIntersection)
        // console.log('======updateProtectedFields[CPFK]',createProtectedFields[CPFK]);
        createProtectedFieldsIntersection = createProtectedFieldsIntersection.filter(
          (value) => {
            // console.log('======value',value);
            return createProtectedFields[CPFK].includes(value);
          }
        );
      }
    }
  }
  // console.log('====createProtectedFieldsIntersection', createProtectedFieldsIntersection)
  // console.log('====end')

  for (const dataKey in objectData) {
    if ((createProtectedFieldsIntersection || []).includes(dataKey)) {
      return false;
    }
  }
  return true;
}

function vailateUpdateProtectedFields(
  userTokens = [],
  updateProtectedFields = {},
  objectData = {},
  originalObject = {}
) {
  if (updateProtectedFields) {
    let updateProtectedFieldsIntersection;

    for (const UPFK in updateProtectedFields) {
      if (Object.prototype.hasOwnProperty.call(updateProtectedFields, UPFK)) {
        let userToken = UPFK;
        if (userToken.startsWith("userField:")) {
          const columnName = UPFK.substring(10);
          userToken = (originalObject[columnName] || {}).objectId; // userID
          // //console.log('UPFK', UPFK, this.data[columnName], columnName)
        }
        if (userTokens.includes(userToken)) {
          if (!updateProtectedFieldsIntersection) {
            updateProtectedFieldsIntersection = updateProtectedFields[UPFK];
          }
          updateProtectedFieldsIntersection = updateProtectedFieldsIntersection.filter(
            (value) => {
              return updateProtectedFields[UPFK].includes(value);
            }
          );
        }
      }
    }
    // console.log('====updateProtectedFieldsIntersection', updateProtectedFieldsIntersection)
    // console.log('====objectData', objectData);
    for (const dataKey in objectData) {
      if ((updateProtectedFieldsIntersection || []).includes(dataKey)) {
        return false;
      }
    }
    return true;
  }
}

function findDifferentObjectData(originalObject, object) {
  const editObjectData = {};
  // console.log('===originalObject',originalObject);
  // console.log('===object',object);

  if (isDifferentObject(originalObject, object)) {
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(originalObject, key)) {
        if (typeof originalObject[key] === "object") {
          if (isDifferentObject(originalObject[key], object[key])) {
            // console.log('---in')
            editObjectData[key] = object[key];
          }
        } else {
          if (originalObject[key] !== object[key]) {
            editObjectData[key] = object[key];
          }
        }
      } else {
        editObjectData[key] = object[key];
      }
    }
  }
  return editObjectData;
}

function isDifferentObject(originalObject, object) {
  for (const key in originalObject) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) {
      return true;
    }
  }

  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(originalObject, key)) {
      if (typeof originalObject[key] === "object") {
        // console.log('===in1');
        // console.log(originalObject[key]);
        // console.log(object[key]);
        if (isDifferentObject(originalObject[key], object[key])) {
          return true;
        }
      } else {
        if (originalObject[key] !== object[key]) {
          return true;
        }
      }
    } else {
      return true;
    }
  }
  return false;
}
