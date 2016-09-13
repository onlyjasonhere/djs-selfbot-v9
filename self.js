'use strict';
const Discord = require("discord.js");
const bot = new Discord.Client({fetch_all_members: true});
const config = require('./config.json');
const now = require('performance-now');

const log = (msg) => {
  // Very basic login function. Change the ID below to a channel for logging, or change to console.log!
  //bot.channels.get("204752675680681984").sendMessage(msg);
};

// Before using, rename `selfbot.sqlite.example` to `selfbot.sqlite`
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./selfbot.sqlite');

bot.on('ready', () => {
  log(`Selfbot Rewrite: Ready to spy on ${bot.users.size} users, in ${bot.channels.size} channels of ${bot.guilds.size} servers.`);
  console.log("=> Ready");
});

bot.on('message', msg => {
  // Stop everything if the message is from someone else
  if(msg.author.id !== bot.user.id) return;
  
  // Stop everything if the message doesn't start with the prefix (in config.json)
  if(!msg.content.startsWith(config.prefix)) return;

  // check if the message is just "/something", check database for "slash" command.
  if(msg.content.split(" ").length === 1) {
    db.get(`SELECT * FROM shortcuts WHERE name = ?`, [msg.content.slice(1)], (err, row) => {
      if(err) console.error(err);
      if(!row) return;
      msg.edit(row.contents);
      db.run(`UPDATE shortcuts SET used = used+1 WHERE name = '${msg.content.slice(1)}'`);
    });
  }
  
  // get command name
  var command = msg.content.split(" ")[0].slice(config.prefix.length);
  // get command parameters for all the other commands.
  var params = msg.content.split(" ").slice(1);
  
  if(command === "tag") {
     db.serialize(function() {
      db.get(`SELECT * FROM tags WHERE name = '${params[0]}'`, (err, row) => {
        if(err) {log(err)}
        if(row) {
          let message_content = msg.mentions.users.array().length === 1 ? `${msg.mentions.users.array()[0]} ${row.contents}` : row.contents;
          setTimeout( () => {
            msg.edit(message_content);
          }, 20);
          db.run(`UPDATE tags SET used = used+1 WHERE name = '${params[0]}'`);
         }
         else msg.edit(`You dumbass, that tag doesn't exist. Go back to school!`).then(setTimeout(msg.delete.bind(msg), 1000));
       });
     });
  } else
  
  if(command === "findemote") {
    let emoji_name = params[0];
    let emoji = bot.emojis.find("name", "emoji_name");
    if(emoji && emoji.id) {
      msg.edit(`The emoji **${emoji_name}** is apparently in: \`${emoji.guild.name}\``);
    } else {
      msg.edit(`Emoji named **${emoji_name}** wasn't found in my list.`);
    }
  } else
  
  if(command === "addtag") {
    let name = params[0];
    let contents = params.slice(1).join(" ");
    db.serialize(function() {
      
      db.get(`SELECT * FROM tags WHERE name = '${params[0]}'`, (err, row) => {
        if(err) {log(err)}
        if(!row) {
          var stmt = db.prepare(`INSERT INTO "tags" (name, contents) VALUES (?, ?)`);
          stmt.run(name, contents);
          stmt.finalize();
          msg.edit(`Tag was added: ${name}`).then(setTimeout(msg.delete.bind(msg), 1000));
        }
        else  msg.edit(`Bitch that tag already exists`).then(setTimeout(msg.delete.bind(msg), 1000));

      });
      
    });

  } else

  if(command === "addslash") {
    let name = params[0];
    let contents = params.slice(1).join(" ");
    db.serialize(() => {
      
      db.get(`SELECT * FROM shortcuts WHERE name = '${params[0]}'`, (err, row) => {
        if(err) {log(err)}
        if(!row) {
          var stmt = db.prepare(`INSERT INTO "shortcuts" (name, contents) VALUES (?, ?)`);
          stmt.run(name, contents);
          stmt.finalize();
          msg.edit("Shortcut was added: "+name).then(setTimeout(msg.delete.bind(msg), 1000));
          
        } else {
          msg.edit(msg.author, "Bitch that shortcut already exists. Srsly?").then(setTimeout(msg.delete.bind(msg), 1000));
        }
      });
      
    });
    
  } else
  
  if(command === "slashes") {
    db.serialize(function() {
      db.all(`SELECT * FROM shortcuts`, (err, rows) => {
        if(err) {log(err)};
        let message = [];
        message.push("```xl");
        var longest = rows.reduce(function (a, b) { return a.name.length > b.name.length ? a : b; });
        rows.map(row=>{
          let padded = (row.name + " ".repeat(longest.name.length+1-row.name.length));
          let count = (row.used + " ".repeat(3-row.used.toString().length));
          //console.log(`${padded}: `);
          message.push(`${config.prefix}${padded} : ${count} : ${row.contents}`);
        });
        message.push("```");
        msg.edit(message.join("\n"));
      });
    });
  } else
  
  if(command === "tags") {
    db.serialize(function() {
      db.all("SELECT * FROM tags", (err, rows) => {
        if(err) {log(err)}
        msg.edit(`List of tags: ${rows.map(r => `${r.name} (${r.used})`).join(" ; ")}`);
      });
    });
  } else
  
  if(command === "deltag") {
    db.serialize(function() {
      db.run(`DELETE FROM tags WHERE name = '${params[0]}'`, (err) => {
        if(err) {log(err)}
        msg.edit(`The tag ${params[0]} has been deleted`).then(setTimeout(msg.delete.bind(msg), 1000));
      });
    });
  } else 
  
  if(command === "prune") {
    let messagecount = parseInt(params[0]) ? parseInt(params[0]) : 1;
    msg.channel.fetchMessages({limit: 100})
    .then(messages => {
      let msg_array = messages.array();
      msg_array = msg_array.filter(m => m.author.id === bot.user.id);
      msg_array.length = messagecount + 1;
      msg_array.map(m => m.delete().catch(console.error));
     });
  } else 
  
  if(command === "purge") {
    let messagecount = parseInt(params[0]);
    msg.channel.fetchMessages({limit: messagecount})
    .then(messages => {
      messages.map(m => m.delete().catch(console.error) );
    }).catch(console.error);
  } else 
  
  // manually ban user by ip in the current server. testing/emergency purposes!
  if(command === "idban") {
    let ban_id = params[0];
    let days = params[1];
    msg.guild.ban(ban_id, days)
     .then( () => console.log(`Banned ${ban_id} and removed ${days} days of messages`))
     .catch(console.error);
    //199591377032445953 (logandark)
  }

  if(command === "ping") {
    var startTime = now();
    msg.delete();
    msg.channel.sendMessage("Let's see if this works")
    .then( message => {
      var endTime = now();
      message.edit(`Ping took ${(endTime - startTime).toFixed(3)} ms. I think.`).catch(console.error);
    }).catch(console.error);
  } else
  
  if(command === "playing") {
    var game = msg.content.split(" ").slice(1).join(" ");
    bot.user.setStatus(null, game);
    msg.delete().catch(console.error);
  } else
  
  if(command === "rename") {
    var username = msg.content.split(" ").slice(1).join("_");
    bot.user.setUsername(username);
    msg.channel.sendMessage(`Renamed myself to **${username}** because I can.`).catch(console.error);
    msg.delete().catch(console.error);
  } else
  
  if(command === "eval") {
    var code = msg.content.split(" ").slice(1).join(" ");

    try {
        var evaled = eval(code);
        if (typeof evaled !== 'string')
          evaled = require('util').inspect(evaled);
        msg.channel.sendMessage("```xl\n" + 
        clean(evaled) +
        "\n```"
        );        
    }
    catch(err) {
        msg.channel.sendMessage("`ERROR` ```xl\n" +
        clean(err) +
        "\n```");
    }
  }
})

bot.login(config.botToken);

function clean(text) {
  if (typeof(text) === "string") {
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  }
  else {
      return text;
  }
}