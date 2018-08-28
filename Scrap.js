const { Client, RichEmbed , Attachment } = require('discord.js');
const https = require('https');
const ytdl = require('ytdl-core');
const client = new Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
  const command = message.content;
  let queue = [];

  // command to roll dice
  if (command === '!roll') {
    let num1 = Math.floor(Math.random()*6) + 1;
    let num2 = Math.floor(Math.random()*6) + 1;
    message.channel.send(printDiceRoll(num1, num2));
    message.channel.send(num1 + num2);
  }

  // command to flip coin
  if (command === '!flip') {
    let flip = Math.floor(Math.random()*2);
    let result = (flip == 1) ? "Heads" : "Tails";
    message.channel.send(result);
  }

  // play youtube audio command
  // Voice only works in guilds, if the message does not come from a guild we ignore it
  if (message.guild && command.startsWith('!play')) {
    // check if a valid query has been made
    const query = message.content.substr(5);
    const voiceCon = message.guild.voiceConnection; // relevant voiceCon if client is connected to any voice channel in this guild
    if(query === '') {
        message.channel.send('Usage: !play <title>');
    }
    else if(!message.member.voiceChannel) {
        message.channel.send("You need to join a voice channel first!");
    }
    else if(voiceCon != null && voiceCon.channel.id != message.member.voiceChannelID) {
        message.channel.send("You need to be in the same voice channel as me to use this command");
    }
    else {
       message.channel.send("🔍 Searching YouTube for`" + query + "`");
       https.get("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q="+
                  query+"&key={ YOUR API KEY }", (resp) => {

           let data = '';
           // get the JSON data
           resp.on('data', (chunk) => {
              data += chunk;
           });

           // The whole response has been received. Print out the result.
           resp.on('end', () => {
                if(JSON.parse(data).items.length == 0) {
                    message.channel.send("No results were found :upside_down:");
                    return;
                }
                const videoURL = 'https://www.youtube.com/watch?v=' + JSON.parse(data).items[0].id.videoId;
                const channelURL = "https://www.youtube.com/channel/" + JSON.parse(data).items[0].snippet.channelId;
                const channelTitle = JSON.parse(data).items[0].snippet.channelTitle;
                // Only try to join the sender's voice channel if they are in one themselves
                  message.member.voiceChannel.join()
                    .then(connection => { // Connection is an instance of VoiceConnection
                        message.channel.send("► Playing `" + JSON.parse(data).items[0].snippet.title + "`");

                        const stream = ytdl(videoURL, { quality: 'highestaudio', filter : 'audioonly' } );
                        const dispatcher = connection.playStream(stream);
            
                        const myCallback = function (err, info) {
                            if (err) throw err;

                            let time = getDurationString(info.length_seconds);
                             const embed = new RichEmbed()
                                .setTitle(JSON.parse(data).items[0].snippet.title)
                                .setURL(videoURL)
                                .setColor(0x000000)
                                .setImage(JSON.parse(data).items[0].snippet.thumbnails.medium.url)
                                .addField("Channel", "[" + channelTitle + "](" + channelURL + ")", true)
                                .addField("Song Duration", time, true);

                            message.channel.send(embed);             
                        };

                        ytdl.getBasicInfo(videoURL, myCallback);

                        dispatcher.on('end', () => {
                            connection.disconnect();
                        });
                    })
                    .catch(console.error);
                
           });
          }).on("error", (err) => {
            console.log("Error: " + err.message);
          });
    }
  }

  // help command
  if (command === '!help') {
    const embed = new RichEmbed()
      .setTitle('Scrap Help')
      .setColor(0x5DADE2)
      .setDescription('*command list...*')
      .addField("Audio Commands", "`!play <title>`")
      .addField("Random Commands", "`!roll` `!flip`")
    // Send the embed to the same channel as the message
    message.channel.send(embed);
  }
});

client.login(' YOUR BOT TOKEN ');

function getDurationString(seconds) {
    var result = "";
    var hrs;
    var mins;
    var secs = seconds % 60;

    if (seconds > 3600) {
        hrs = Math.floor(seconds / 3600) + ":";
        result += hrs;
    }
    if(seconds > 60) {
        mins = Math.floor(seconds / 60) % 60 + ":";
        if(hrs != null && mins.length < 3)
            mins = "0" + mins;
        result += mins;
    }
    result += secs;
    return result;
}

function printDiceRoll(value1, value2) {
    var diceString = "```";
    diceString += " _________      _________ \n";
    diceString += "|         |    |         |\n";
    for(var i = 1; i < 4; i++) {
        diceString += dottedLines(value1, i) + "    ";
        diceString += dottedLines(value2, i) + "\n";
    }
    diceString += "|_________|    |_________|\n";
    diceString += "                          \n";
    diceString += "```";
    return diceString;
}

function dottedLines(value, line) {
    if(line == 1) {
        if(value >= 4)
            return "|  *   *  |";
        else if(value == 2 || value == 3)
            return "|  *      |";
        return "|         |";
    }
    if(line == 2) {
        if(value % 2 != 0) // odd face values
            return "|    *    |";
        else if(value == 6)
            return "|  *   *  |";
        return "|         |";
    }
    if(line == 3) {
        if(value == 2 || value == 3)
            return "|      *  |";
        else if(value != 1) 
            return "|  *   *  |";
        return "|         |";
    }
    return "";
}