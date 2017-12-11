// chat bot tư vấn tuyển sinh
// danh sách thành viên
// +Trần Lê Thanh Phan
// +Nguyễn Phước Thành
// +Ngô Đình Minh Quân
// +Huỳnh Ngọc Minh
// 
var logger = require('morgan');
var http = require('http');
var bodyParser = require('body-parser');
var express = require('express');
var request = require('request');
var router = express();
const apiaiApp = require('apiai')('944514d4563e4b6b9f42280fefdf9817');

var app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
var server = http.createServer(app);
var emojiString = [":)", ":D", ":(", ":'(", ":P", "O:)", "3:)", "o.O", ";)", ":O", "-_-", ":O", ":*", "^_^", "8-)", "8|", ":(", ":v", ":/", ":3", "&lt;3", "(y)", "(^^^)", "<(\")", ":|/]"];

var admID = "1630075473701138"; //id củaPhanTLT
var appID = "2017209618507956"; // id của tư vấn tuyển sinh
var PAGE_ACCESS_TOKEN = "EAACUgY2dBNMBAB5zbjF64aDhzXUDZCUqx6tS2rptKS8OlMZCVVdFiS3ahsOlXgIz0z4H3WYDdCO4CIi5OZAyRFecxSbA25BWydFkC2gfG1EISoHAAZC0kYxpFvmp7U6FDI6BpTAUkL6wWywxZBF7r7ZC75RqRlgVt69ZCvsWcLM0hcqfa00EKZC8";

var senderContext = {};
var previousMessageHash = {};
var firstName = "undefined";
var lastName = "undefined";

//train
var list_ask = [];
// file sử dụng để lưu kịch bản
var fs = require('fs');
var read = fs.readFileSync('./scripts/script_tvts.json', "utf8");
var list_script = JSON.parse(read);
var is_Ask = false;

var jsonData = require("./school_data.json");
var jokes = require('./scripts/truyen_cuoi.json');

//var jsonTalkScript = require("./scripts/talkative.json");
app.listen(process.env.PORT || 3000);

app.get('/', (req, res) => {
  res.send("Server chạy ngon lành.");
});

app.get('/webhook', function(req, res) {
  if (req.query['hub.verify_token'] === '6969') {
    res.send(req.query['hub.challenge']);
  }
  res.send('Error, wrong validation token');
});

// Đoạn code xử lý khi có người nhắn tin cho bot
app.post('/webhook', function(req, res) {

  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        }
        else if (event.postback) {
          receivedPostback(event);
        }
        else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });
    res.status(200).send("OK");
  }
});

function receivedPostback(event) {
  callGetLocaleAPI(event, handleReceivedPostBack);
}

function handleReceivedPostBack(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  var message = event.message;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  if (event.postback.title.toLocaleLowerCase().indexOf("bắt đầu") > -1) {
    sendTextMessageToID(senderID, "xin chào " + senderContext[senderID].firstName + ". Mình là Meow chatbot của trang Tư Vấn Tuyển Sinh. Meow có thể tư vấn cho bạn về thông tin tuyển sinh bằng cách nhập TVTS hoặc Tư Vấn Tuyển Sinh, hoặc click chọn chức năng Tư Vấn Tuyển Sinh ở thành menu trò chuyện");
  }
  else if (event.postback.title.toLowerCase().indexOf('tư vấn tuyển sinh') > -1) {
    senderContext[senderID].city_name = "";
    senderContext[senderID].town_name = "";
    senderContext[senderID].school_name = "";
    senderContext[senderID].special_name = "";
    senderContext[senderID].subject_name = "";
    senderContext[senderID].year = "";
    senderContext[senderID].current_question = 0;
    //state
    senderContext[senderID].state = "tvts";
    sendChoose(senderID);
  }
  else if (event.postback.title.toLowerCase().indexOf('sinh viên cười') > -1) {
    senderContext[senderID].state = "tcsv";
    sendJokes(senderID);
  }
  else if (event.postback.title.toLowerCase().indexOf('đến giờ học') > -1) {
    if (senderID == admID) {
      senderContext[senderID].state = "train";
      sendTrainQuest();
    }
    else {
      sendTextMessageToID(senderID, "chức năng này chỉ cho admin");
    }
  }
}

function receivedMessage(event) {
  callGetLocaleAPI(event, handleReceivedMessage);
}


function handleReceivedMessage(event) {

  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  var quickReply = message.quick_reply;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  //var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.

    if (messageText.toLowerCase().indexOf('tư vấn tuyển sinh') > -1 || messageText.toLowerCase().indexOf('tvts') > -1) {
      senderContext[senderID].city_name = "";
      senderContext[senderID].town_name = "";
      senderContext[senderID].school_name = "";
      senderContext[senderID].special_name = "";
      senderContext[senderID].subject_name = "";
      senderContext[senderID].year = "";
      senderContext[senderID].current_question = 0;
      //state
      senderContext[senderID].state = "tvts";
      sendChoose(senderID);
    }
    else if (quickReply) {
      if (senderContext[senderID].state == "tvts") {
        // back 
        if (messageText.toLowerCase().indexOf('trở về') > -1) {
          if (senderContext[senderID].current_question == 0) {
            sendTextMessageToID(senderID, "hẹn gặp lại " + senderContext[senderID].firstName + " " + senderContext[senderID].lastName);
          }
          senderContext[senderID].current_question -= 1;
        }
        else {
          if (senderContext[senderID].current_question == 0) {
            senderContext[senderID].city_name = messageText;
          }
          else if (senderContext[senderID].current_question == 1) {
            senderContext[senderID].town_name = messageText;
          }
          else if (senderContext[senderID].current_question == 2) {
            senderContext[senderID].school_name = messageText;
          }
          else if (senderContext[senderID].current_question == 3) {
            senderContext[senderID].special_name = messageText;
          }
          else if (senderContext[senderID].current_question == 4) {
            senderContext[senderID].subject_name = messageText;
          }
          else if (senderContext[senderID].current_question == 5) {
            senderContext[senderID].year = messageText;
          }
          else if (senderContext[senderID].current_question == 6) {
            sendResult(senderID);
          }
          senderContext[senderID].current_question += 1;
        }
        if (senderContext[senderID].current_question >= 0) {
          sendChoose(senderID);
        }
      }
      else if (senderContext[senderID].state == "tcsv") {
        if (messageText.toLowerCase().indexOf('cười đủ rồi') > -1) {
          sendTextMessageToID(senderID, "lần khác Meow kể tiếp nghe");
        }
        else {
          sendJokes(senderID);
        }
      }
    }
    else if (messageText.toLowerCase().indexOf('sinh viên cười') > -1) {
      senderContext[senderID].state = "tcsv";
      sendJokes(senderID);
    }
    else if (senderID == admID && messageText.toLowerCase().indexOf('đến giờ học') > -1) {
      if (senderID == admID) {
        senderContext[senderID].state = "train";
        sendTrainQuest();
      }
      else {
        sendTextMessageToID(senderID, "chức năng này chỉ cho admin");
      }
    }
    else if (senderContext[senderID].state == "train") {
      if (senderID == admID && is_Ask) {
        if (messageText.toLowerCase() == "stop train") {
          // is_Ask = false;
          sendTextMessageToID(admID, "bữa khác dạy cho meow tiếp nhé!");
          // add lại để lần sau trả lời tiếp
          list_ask.push(current_ask);
          senderContext[senderID].state = "";
        }
        else {
          var script = { quest: current_ask.quest, anwser: messageText };
          list_script.push(script);
          var convertedObjects = JSON.stringify(list_script);
          var fs = require('fs');
          fs.writeFileSync('./scripts/script_tvts.json', convertedObjects, "utf8");
          sendTextMessageToID(current_ask.senderID, "mình trả lời câu hỏi " + current_ask.quest + " nhé !\n" + messageText);
          sendTrainQuest();
        }
      }
    }
    else if (senderID == admID && messageText.toLowerCase().indexOf('save script') > -1) {
      // in ra file đã ghi trong doesntexist.txt
      showSaveTrain();
    }
    else if (messageText.toLowerCase().indexOf('add menu') > -1) {
      addPersistentMenu();
    }
    else if (messageText.toLowerCase().indexOf('remove menu') > -1) {
      removePersistentMenu();
    }
    else if (messageText.toLowerCase().indexOf('send image') > -1) {

      sendImageMessage(senderID, "http://www.mikufan.com/wp-content/uploads/2017/03/feature_prm_hatsunemiku_a001.jpg");
    }
    // else if (messageText.toLowerCase().indexOf('gif') > -1) {
    //   sendGifMessage(senderID);
    // }
    // else if (messageText.toLowerCase().indexOf('audio') > -1) {
    //   sendAudioMessage(senderID);
    // }
    // else if (messageText.toLowerCase().indexOf('video') > -1) {
    //   sendVideoMessage(senderID);
    // }
    else if (messageText.toLowerCase().indexOf('typing on') > -1) {
      sendTypingOn(senderID);
    }
    else if (messageText.toLowerCase().indexOf('typing off') > -1) {
      sendTypingOff(senderID);
    }
    else if (messageText.toLowerCase().indexOf('xin chào') > -1) {
      sendTextMessageToID(senderID, "xin chào " + senderContext[senderID].firstName + " " + senderContext[senderID].lastName);
    }
    else if (messageText.toLowerCase().indexOf('xem thông tin') > -1) {
      var currenttime = convertTimestamp(timeOfMessage);
      sendTextMessageToID(senderID, senderContext[senderID].firstName + " " + senderContext[senderID].lastName + " " + senderContext[senderID].locale + " " + senderContext[senderID].timezone + " " + currenttime);
    }
    else if (checkEmotion(messageText)) {
      var reply = getRandomEmotion();
      sendTextMessageToID(senderID, reply);
    }
    else {
      var replyScript = searchScripts(messageText);
      if (replyScript != "") {
        sendTextMessageToID(senderID, replyScript);
      }
      else {
        //không tìm thấy thông tin của câu hỏi
        if (senderID != appID) {
          sendTextMessageToID(senderID, "câu hỏi của " + senderContext[senderID].firstName + " hiện Meow không biết trả lời,để Meow nhắn cho thằng đệ nó trả lời thay! " + getRandomEmotion() + ",Meow sẽ nhắn cho bạn sớm nhất có thể nhé ");
          //to train
          askAdm(senderID, messageText);
        }
      }
      //    sendMessage(event);
    }
  }
  else if (messageAttachments) {
    sendMessage(event);
  }
}

function sendJokes(recipientId) {
  var jokeString = "";

  while (jokeString === "") {
    var random = Math.floor(Math.random() * jokes.length);
    jokeString = jokes[random].joke;
  }

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: jokeString,
      quick_replies: [{
          "content_type": "text",
          "title": "khác",
          "payload": "joke"
        },
        {
          "content_type": "text",
          "title": "Cười đủ rồi",
          "payload": "home"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

function showSaveTrain() {
  var convertedObjects = JSON.stringify(list_script);
  sendTextMessageToID(admID, convertedObjects);

}

function getRandomEmotion() {
  var maxLength = emojiString.length;
  var random = Math.floor(Math.random() * maxLength);
  return emojiString[random];
}

function searchScripts(messageText) {
  var replys = [];
  for (var index in list_script) {
    if (messageText.toLowerCase().indexOf(list_script[index].quest.toLowerCase()) > -1) {
      replys.push(list_script[index].anwser);
    }
  }
  var maxLength = replys.length;
  if (maxLength == 0) {
    return "";
  }
  else {
    var random = Math.floor(Math.random() * maxLength);
    return replys[random];
  }
}

//object to train
function askAdm(senderID, messageText) {
  var object_ask = {};
  object_ask.senderID = senderID;
  object_ask.quest = messageText;
  list_ask.push(object_ask);
}
var current_ask = {};

function sendTrainQuest() {
  is_Ask = true;
  if (list_ask.length > 0) {
    current_ask = list_ask.pop();
    sendTextMessageToID(admID, "trả lời giúp meow câu hỏi này với Admin:\n" + current_ask.quest);
  }
  else {
    sendTextMessageToID(admID, "hiện tại meow không có câu hỏi nào :P");
    senderContext[admID].state = "";
    is_Ask = false;
  }

}

function checkEmotion(messageText) {
  var kt = false;
  for (var emo in emojiString) {
    if (emojiString[emo] == messageText) {
      kt = true;
      break;
    }
  }
  return kt;
}
// chuyển đổi timestamp thành ngày giờ mặt trời
function convertTimestamp(timestamp) {
  var d = new Date(timestamp), // Convert the passed timestamp to milliseconds
    yyyy = d.getFullYear(),
    mm = ('0' + (d.getMonth() + 1)).slice(-2), // Months are zero based. Add leading 0.
    dd = ('0' + d.getDate()).slice(-2), // Add leading 0.
    hh = d.getHours(),
    h = hh,
    min = ('0' + d.getMinutes()).slice(-2), // Add leading 0.
    sec = ('0' + d.getSeconds()).slice(-2),
    ampm = 'AM',
    time;

  if (hh > 12) {
    h = hh - 12;
    ampm = 'PM';
  }
  else if (hh === 12) {
    h = 12;
    ampm = 'PM';
  }
  else if (hh == 0) {
    h = 12;
  }

  // ie: 2013-02-18, 8:35 AM	
  time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ":" + sec + ' ' + ampm;

  return time;
}
// sử dụng để lấy thông tin người dùng
function callGetLocaleAPI(event, handleReceived) {

  var userID = event.sender.id;
  var http = require('https');
  var path = '/v2.6/' + userID + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + PAGE_ACCESS_TOKEN;
  var options = {
    host: 'graph.facebook.com',
    path: path
  };
  // login already
  if (senderContext[userID]) {
    firstName = senderContext[userID].firstName;
    lastName = senderContext[userID].lastName;
    console.log("found " + JSON.stringify(senderContext[userID]));
    if (!firstName)
      firstName = "undefined";
    if (!lastName)
      lastName = "undefined";

    handleReceived(event);
    return;
  }
  // first login
  var req = http.get(options, function(res) {
    //console.log('STATUS: ' + res.statusCode);
    //console.log('HEADERS: ' + JSON.stringify(res.headers));

    // Buffer the body entirely for processing as a whole.
    var bodyChunks = [];
    res.on('data', function(chunk) {
      // You can process streamed parts here...
      bodyChunks.push(chunk);
    }).on('end', function() {
      var body = Buffer.concat(bodyChunks);
      var bodyObject = JSON.parse(body);
      firstName = bodyObject.first_name;

      lastName = bodyObject.last_name;
      if (!firstName)
        firstName = "undefined";
      if (!lastName)
        lastName = "undefined";
      senderContext[userID] = {};
      senderContext[userID].firstName = firstName;
      senderContext[userID].lastName = lastName;
      senderContext[userID].city_name = "";
      senderContext[userID].town_name = "";
      senderContext[userID].school_name = "";
      senderContext[userID].special_name = "";
      senderContext[userID].subject_name = "";
      senderContext[userID].year = "";
      senderContext[userID].state = "";
      senderContext[userID].timezone = bodyObject.timezone;
      senderContext[userID].locale = bodyObject.locale;
      senderContext[userID].current_question = 0;
      console.log("defined " + JSON.stringify(senderContext));
      handleReceived(event);
    })
  });
  req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
  });
}

function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = apiaiApp.textRequest(text, {
    sessionId: 'tabby_cat' // use any arbitrary id
  });

  apiai.on('response', (response) => {
    let aiText = response.result.fulfillment.speech;

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: {
        recipient: { id: sender },
        message: { text: aiText }
      }
    }, (error, response) => {
      if (error) {
        console.log('Error sending message: ', error);
      }
      else if (response.body.error) {
        console.log('Error: ', response.body.error);
      }
    });
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}

function sendImageMessage(recipientId, path) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: path
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendTextMessageToID(recipientId, messageText) {

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function getCityList(recipientId) {
  return jsonData.list;
}

function getTownList(recipientId) {
  var city_list = getCityList();
  for (var city in city_list) {
    if (city_list[city].city_name == senderContext[recipientId].city_name) {
      return city_list[city].townList;
    }
  }
}

function getSchoolList(recipientId) {
  var town_list = getTownList(recipientId);
  for (var town in town_list) {
    if (town_list[town].town_name == senderContext[recipientId].town_name) {
      return town_list[town].school_list;
    }
  }
}

function getSpecialList(recipientId) {
  var school_list = getSchoolList(recipientId);
  for (var school in school_list) {
    if (school_list[school].school_name == senderContext[recipientId].school_name) {
      return school_list[school].Special_list;
    }
  }
}

function getObjectList(recipientId) {
  var special_list = getSpecialList(recipientId);
  for (var special_item in special_list) {
    if (special_list[special_item].special_name == senderContext[recipientId].special_name) {
      return special_list[special_item].subject_list;
    }
  }
}

function getYearList(recipientId) {
  var object_list = getObjectList(recipientId);
  for (var object in object_list) {
    if (object_list[object].subject_name == senderContext[recipientId].subject_name) {
      return object_list[object].year_list;
    }
  }
}

function sendCityList(recipientId) {

  sendTextMessageToID(recipientId, "Cho Meow biết thành phố bạn muốn học nào?");

  var city_list = getCityList(recipientId);

  var result = [];
  var option = [];
  for (var index in city_list) {
    var json_school = {
      title: city_list[index].city_name,
      subtitle: city_list[index].detail,
      item_url: city_list[index].item_url,
      image_url: city_list[index].picture,
      buttons: [{
        type: "web_url",
        url: city_list[index].item_url,
        title: "Xem Thêm"
      }],
    };
    var json_quick_reply = {
      "content_type": "text",
      "title": city_list[index].city_name,
      "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    };
    option.push(json_quick_reply);
    result.push(json_school);
  }
  var object_send = {
    template_type: "generic",
    elements: result
  };

  var json_back_reply = {
    content_type: "text",
    title: "Trở về",
    payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
  };
  option.push(json_back_reply);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: object_send
      },
      quick_replies: option
    }
  };
  callSendAPI(messageData);
}

function sendTownList(recipientId) {
  sendTextMessageToID(recipientId, "Cho Meow biết quận bạn muốn học nào tại thành phố " + senderContext[recipientId].city_name + " nào?");
  var school_list = jsonData.list;
  var result = [];
  var option = [];

  var town_list = getTownList(recipientId);
  for (var index in town_list) {
    var json_town = {
      title: town_list[index].town_name,
      subtitle: town_list[index].detail,
      item_url: town_list[index].item_url,
      image_url: town_list[index].picture,
      buttons: [{
        type: "web_url",
        url: town_list[index].item_url,
        title: "Xem Thêm"
      }],
    };
    var json_quick_reply = {
      "content_type": "text",
      "title": town_list[index].town_name,
      "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    };
    option.push(json_quick_reply);
    result.push(json_town);

  }
  var json_back_reply = {
    content_type: "text",
    title: "Trở về",
    payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
  };
  option.push(json_back_reply);
  var object_send = {
    template_type: "generic",
    elements: result
  };
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: object_send
      },
      quick_replies: option
    }
  };

  callSendAPI(messageData);
}

function sendSchoolList(recipientId) {
  sendTextMessageToID(recipientId, "cho Meow biết trường bạn muốn chọn tại khu vực " + senderContext[recipientId].town_name + " nào?");
  var option = [];
  var city_list = jsonData.list;

  var result = [];
  var school_list = getSchoolList(recipientId);
  for (var school in school_list) {
    var json_school = {
      title: school_list[school].school_name,
      subtitle: school_list[school].detail,
      item_url: school_list[school].item_url,
      image_url: school_list[school].picture,
      buttons: [{
        type: "web_url",
        url: school_list[school].item_url,
        title: "Xem Thêm"
      }],
    };
    var json_quick_reply = {
      "content_type": "text",
      "title": school_list[school].school_name,
      "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    };
    option.push(json_quick_reply);
    result.push(json_school);
  }

  var json_back_reply = {
    content_type: "text",
    title: "Trở về",
    payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
  };
  option.push(json_back_reply);
  var object_send = {
    template_type: "generic",
    elements: result
  };
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: object_send
      },
      quick_replies: option
    }
  };

  callSendAPI(messageData);
}

function sendSpecialList(recipientId) {
  sendTextMessageToID(recipientId, "cho Meow biết khoa bạn muốn chọn tại trường " + senderContext[recipientId].school_name + " nào?");
  var city_list = jsonData.list;

  var result = [];
  var option = [];

  var special_list = getSpecialList(recipientId);
  for (var special_item in special_list) {
    var json_school = {
      title: special_list[special_item].special_name,
      subtitle: special_list[special_item].detail,
      item_url: special_list[special_item].item_url,
      image_url: special_list[special_item].picture,
      buttons: [{
        type: "web_url",
        url: special_list[special_item].item_url,
        title: "Xem Thêm"
      }],
    };
    var json_quick_reply = {
      "content_type": "text",
      "title": special_list[special_item].special_name,
      "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    };
    option.push(json_quick_reply);
    result.push(json_school);
  }

  var json_back_reply = {
    content_type: "text",
    title: "Trở về",
    payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
  };
  option.push(json_back_reply);
  var object_send = {
    template_type: "generic",
    elements: result
  };
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: object_send
      },
      quick_replies: option
    }
  };

  callSendAPI(messageData);
}

function sendObjectList(recipientId) {
  var city_list = jsonData.list;
  sendTextMessageToID(recipientId, "cho Meow biết ngành bạn muốn chọn của khoa " + senderContext[recipientId].special_name + " nào?");
  var result = [];
  var option = [];

  var object_list = getObjectList(recipientId);
  for (var object in object_list) {
    var json_school = {
      title: object_list[object].subject_name,
      subtitle: object_list[object].detail,
      item_url: object_list[object].item_url,
      image_url: object_list[object].picture,
      buttons: [{
        type: "web_url",
        url: object_list[object].item_url,
        title: "Xem Thêm"
      }],
    };
    var json_quick_reply = {
      "content_type": "text",
      "title": object_list[object].subject_name,
      "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    };
    option.push(json_quick_reply);
    result.push(json_school);
  }
  var json_back_reply = {
    content_type: "text",
    title: "Trở về",
    payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
  };
  option.push(json_back_reply);
  var object_send = {
    template_type: "generic",
    elements: result
  };
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: object_send
      },
      quick_replies: option
    }
  };

  callSendAPI(messageData);

}

function sendYearList(recipientId) {
  var city_list = jsonData.list;
  var option = [];
  var year_list = getYearList(recipientId);
  for (var year in year_list) {

    var json_quick_reply = {
      "content_type": "text",
      "title": year_list[year].year,
      "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    };
    option.push(json_quick_reply);
  }
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Cho meow biết năm bạn muốn tìm kiếm" + senderContext[recipientId].subject_name,
      quick_replies: option
    }
  };

  callSendAPI(messageData);

}

function sendResult(recipientId) {
  var city_list = jsonData.list;

  var result = [];

  for (var city in city_list) {
    if (city_list[city].city_name == senderContext[recipientId].city_name) {
      var town_list = city_list[city].townList;
      for (var town in town_list) {
        if (town_list[town].town_name == senderContext[recipientId].town_name) {
          var school_list = town_list[town].school_list;
          for (var school in school_list) {
            if (school_list[school].school_name == senderContext[recipientId].school_name) {
              var special_list = school_list[school].Special_list;
              for (var special_item in special_list) {
                if (special_list[special_item].special_name == senderContext[recipientId].special_name) {
                  var object_list = special_list[special_item].subject_list;
                  for (var object in object_list) {
                    if (object_list[object].subject_name == senderContext[recipientId].subject_name) {
                      var year_list = object_list[object].year_list;
                      for (var year in year_list) {
                        if (year_list[year].year == senderContext[recipientId].year) {
                          var result_year = "Năm: " + year_list[year].year;
                          var result_nganh = "Mã ngành: " + year_list[year].ma_nganh;
                          var result_chitieu = "Chỉ tiêu: " + year_list[year].chi_tieu;
                          var result_chuthich = "Chú thích: " + year_list[year].chu_thich;
                          sendTextMessageToID(recipientId, result_year + "\n" + result_nganh + "\n" + result_chitieu + "\n" + result_chuthich);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

function sendChoose(recipientId) {
  if (senderContext[recipientId].current_question == 0) {
    sendCityList(recipientId);
  }
  if (senderContext[recipientId].current_question == 1) {
    sendTownList(recipientId);
  }
  if (senderContext[recipientId].current_question == 2) {
    sendSchoolList(recipientId);
  }
  if (senderContext[recipientId].current_question == 3) {
    sendSpecialList(recipientId);
  }
  if (senderContext[recipientId].current_question == 4) {
    sendObjectList(recipientId);
  }
  if (senderContext[recipientId].current_question == 5) {
    sendYearList(recipientId);
  }
  if (senderContext[recipientId].current_question == 6) {
    sendResult(recipientId);
  }
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    }
    else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: "http://messengerdemo.parseapp.com/img/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: "http://messengerdemo.parseapp.com/audio/sample.mp3"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      "text": "Pick a color:",
      "quick_replies": [{
          "content_type": "text",
          "title": "Red",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
        },
        {
          "content_type": "text",
          "title": "Green",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: ""
        }
      }
    }
  };

  callSendAPI(messageData);
}

function addPersistentMenu() {

  var messageData = {
    "persistent_menu": [{
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [{
            "title": "About Us",
            "type": "nested",
            "call_to_actions": [{
                "title": "Trần Lê Thanh Phan",
                "type": "postback",
                "payload": "PAYBILL_PAYLOAD"
              },
              {
                "title": "Nguyễn Phước Thành",
                "type": "postback",
                "payload": "HISTORY_PAYLOAD"
              },
              {
                "title": "Ngô Đình Minh Quân",
                "type": "postback",
                "payload": "CONTACT_INFO_PAYLOAD"
              },
              {
                "title": "Huỳnh Ngọc Minh",
                "type": "postback",
                "payload": "CONTACT_INFO_PAYLOAD"
              },
              {
                "title": "Vin Kiyonaga",
                "type": "postback",
                "payload": "CONTACT_INFO_PAYLOAD"
              }
            ]
          },
          {
            "type": "postback",
            "title": "Tư Vấn Tuyển Sinh",
            "payload": "CONTACT_INFO_PAYLOAD"
          },
          {
            "type": "postback",
            "title": "Sinh Viên Cười",
            "payload": "CONTACT_INFO_PAYLOAD"
          }

        ]
      },
      {
        "locale": "zh_CN",
        "composer_input_disabled": false
      }
    ]
  };

  request({
    uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    }
    else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });

}

function removePersistentMenu() {
  request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      setting_type: "call_to_actions",
      thread_state: "existing_thread",
      call_to_actions: []
    }

  }, function(error, response, body) {
    console.log(response)
    if (error) {
      console.log('Error sending messages: ', error)
    }
    else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}
