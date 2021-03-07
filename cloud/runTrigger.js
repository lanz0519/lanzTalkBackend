const { ParseGraphQLServer } = require("parse-server/lib/GraphQL/ParseGraphQLServer");

/* Parse.Cloud.beforeLogin(res => {
  console.log(res)
})


Parse.Cloud.afterLogin(res => {
  console.log(res)
}) */
// 用户注册钩子
Parse.Cloud.afterSave(Parse.User, async (req) => {
  if (!req.object.get("recentContact")) {
    // 创建联系人表数据
    const Contact = new Parse.Object("Contact")
    let contactId = ''
    Contact.set("user", {
      "__type": "Pointer",
      "objectId": req.object.id,
      "className": "_User"
    })
    const result = await Contact.save()
    // 获取数据插入到对应用户字段
    req.object.set("recentContact", {
      "__type": "Pointer",
      "objectId": result.id,
      "className": "Contact"
    })
    req.object.save(null, {useMasterKey: true})
    console.log(req.object, result)
  }
})

// 添加聊天记录钩子
Parse.Cloud.beforeSave('Record', (req) => {
  let user = {
    __type: "Pointer",
    objectId: req.user.id,
    className: "_User"
  }
  let receiver = {
    __type: "Pointer",
    objectId: req.object.get('receiver'),
    className: "_User"
  }
  req.object.set('sender', user)
  req.object.set('receiver', receiver)
})