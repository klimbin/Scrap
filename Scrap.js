const { Client, RichEmbed , Attachment } = require('discord.js');
const client = new Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// command to roll dice
client.on('message', message => {
  if (message.content === '!roll') {
    var num1 = Math.floor(Math.random()*6) + 1;
    var num2 = Math.floor(Math.random()*6) + 1;
    message.channel.send(printDiceRoll(num1, num2));
    message.channel.send(num1 + num2);
  }
});

// command to flip coin
client.on('message', message => {
  if (message.content === '!flip') {
    var flip = Math.floor(Math.random()*2);
    var result = (flip == 1) ? "Heads" : "Tails";
    message.channel.send(result);
  }
});

const https = require('https');
const ytdl = require('ytdl-core');
const streamOptions = { seek: 0, volume: 1 };
// play audio command
client.on('message', message => {
  // Voice only works in guilds, if the message does not come from a guild,
  // we ignore it
  if (!message.guild) return;

  if (message.content.startsWith('!play')) {
    // check if a valid query has been made
    var query = message.content.substr(5);
    if(query === '') {
        message.reply('Usage: !play <title>');
        return;
    }
    else {
       var videoURL;
       var data = '';
       https.get("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q="+
                  query+"&key={ YOUR API KEY }", (resp) => {
           resp.on('data', (chunk) => {
              data += chunk;
           });

           // The whole response has been received. Print out the result.
           resp.on('end', () => {
                videoURL = 'https://www.youtube.com/watch?v=' + JSON.parse(data).items[0].id.videoId;
                // message.channel.send("Searching YouTube for `" + query + "`");
           });

          }).on("error", (err) => {
            console.log("Error: " + err.message);
          });

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voiceChannel) {
          message.member.voiceChannel.join()
            .then(connection => { // Connection is an instance of VoiceConnection
                message.channel.send("► Playing `" + JSON.parse(data).items[0].snippet.title + "`");

                const stream = ytdl(videoURL, { quality: 'highestaudio', filter : 'audioonly' } );
                const dispatcher = connection.playStream(stream, streamOptions);
    
                var myCallback = function (err, info) {
                    if (err) throw err;

                    var time = getDurationString(info.length_seconds);
                     const embed = new RichEmbed()
                        .setTitle(JSON.parse(data).items[0].snippet.title)
                        .setURL(videoURL)
                        .setColor(0x000000)
                        .setImage(JSON.parse(data).items[0].snippet.thumbnails.medium.url)
                        .addField("Channel", JSON.parse(data).items[0].snippet.channelTitle, true)
                        .addField("Song Duration", time, true);

                    message.channel.send(embed);             
                };

                ytdl.getBasicInfo(videoURL, myCallback);

                dispatcher.on('end', () => {
                    connection.disconnect();
                });
            })
            .catch(console.error);
        } else {
          message.reply('You need to join a voice channel first!');
        }
    }
  }
});

// help command
client.on('message', message => {
  if (message.content === '!help') {
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