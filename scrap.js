const Discord = require('discord.js');
const https = require('https');
const ytdl = require('ytdl-core');

// const TOKEN = "{ YOUR BOT TOKEN }";
// const YOUTUBE_API_KEY = "{ YOUR API KEY }";
const PREFIX = "!"; // command prefix

const client = new Discord.Client();

const helpEmbed = new Discord.RichEmbed()
  .setTitle('Scrap Help')
  .setColor(0x000000)
  .setDescription('*command list...*')
  .addField("Audio Commands", "`!play <song>` `!volume` `!queue` `!skip`")
  .addField("Random Commands", "`!roll` `!flip`")

var servers = {};

function play(connection, message) {
    var server = servers[message.guild.id];
    let videos = server.queue.shift();
    server.queueTitles.shift();

    message.channel.send("► Playing `" + videos[0].snippet.title + "`");
    const videoURL = 'https://www.youtube.com/watch?v=' + videos[0].id.videoId;
    const channelURL = "https://www.youtube.com/channel/" + videos[0].snippet.channelId;
    const channelTitle = videos[0].snippet.channelTitle;

    console.log("playing " + videos[0].snippet.title);
    server.dispatcher = connection.playStream(ytdl(videoURL, { quality: 'highestaudio', filter : 'audioonly' } ), { volume: 0.5 } );

    const myCallback = function (err, info) {
        if (err) throw err;

        let time = getDurationString(info.length_seconds);
        const embed = new Discord.RichEmbed()
            .setTitle(videos[0].snippet.title)
            .setURL(videoURL)
            .setColor(0x000000)
            .setImage(videos[0].snippet.thumbnails.medium.url)
            .addField("Channel", "[" + channelTitle + "](" + channelURL + ")", true)
            .addField("Song Duration", time, true);

        message.channel.send(embed);             
    };

    ytdl.getBasicInfo(videoURL, myCallback);

    server.dispatcher.on("end", function() {
        if (server.queue[0])
            play(connection, message);
        else
            connection.disconnect();
    });
}

client.login(process.env.TOKEN);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (!servers[message.guild.id]) {
        console.log("adding object for queue data on server: " + message.guild.id);
        servers[message.guild.id] = { queue: [], queueTitles: [] };
    }

    if (message.author.equals(client.user)) return;

    if (!message.content.startsWith(PREFIX)) return;

    var args = message.content.substring(PREFIX.length).split(" ");
    var server = servers[message.guild.id];
    switch (args[0].toLowerCase()) {
        case "play":
            if (!args[1]) {
                message.channel.send('❌ Please provide a video title or url.');
            }
            else if (!message.member.voiceChannel || message.member.voiceChannelID == message.guild.afkChannelID) {
                message.channel.send("❌ You need to join a voice channel first!");
            }
            else if(message.guild.voiceConnection != null && message.guild.voiceConnection.channel.id != message.member.voiceChannelID) {
                message.channel.send("❌ You need to be in the same voice channel as me to use this command.");
            }
            else {
                var query;
                if(args[1].includes('https://www.youtube.com/watch?v=')) {
                    query = args[1].substring('https://www.youtube.com/watch?v='.length);
                }
                else {
                    query = message.content.substring(5);
                }

                console.log("users query: " + query);
                https.get("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q="+query
                +"&type=video&key="+process.env.YOUTUBE_API_KEY, (resp) => {

                    let data = '';
                    // get the JSON data
                    resp.on('data', (chunk) => {
                      data += chunk;
                    });

                    // The whole response has been received. Print out the result.
                    resp.on('end', () => {
                        const videos = JSON.parse(data).items;
                        if(videos.length == 0) {
                            message.channel.send("No results were found 🙃");
                            return;
                        }

                        server.queue.push(videos);
                        server.queueTitles.push(videos[0].snippet.title);

                        if(server.dispatcher != undefined && !server.dispatcher.destroyed) {
                            message.channel.send("Added `" + videos[0].snippet.title + "` to the queue.");
                        }
                        else {
                            message.member.voiceChannel.join()
                                .then(connection => {
                                    play(connection, message);
                            })
                            .catch(console.error);
                        }

                        // message.channel.send("🔍 Searching YouTube for `" + query + "`");               
                    });
                }).on("error", (err) => {
                    console.log("Error: " + err.message);
                });
            }
            break;
        case "queue":
            if (server.queue.length == 0)
                message.channel.send("No songs in queue.");
            else {
                let msg = '```';
                for(let i = 0; i < server.queueTitles.length; i++) {
                    msg += "\n" + (i+1) + ": " + server.queueTitles[i];
                }
                msg += '```';
                message.channel.send(msg);
            }
            break;
        case "skip":
            if (server.dispatcher) {
                server.dispatcher.end("song skipped");
            }
            break;
        case "stop":
            if (message.guild.voiceConnection) {
                server.queue.length = 0; // clear queue
                server.dispatcher.end();
                console.log("stopped the queue on server: " + message.guild.id);
            }
            break;
        case "volume":
            let vol = args[1];
            if(vol.length > 0 && !isNaN(vol) && vol >= 0 && vol <= 1) {
                server.dispatcher.setVolume(vol);
                message.channel.send("Volume is now " + vol);
            }
            else {
                message.channel.send("Please enter a number between 0 and 1.")
            }
            break;
        case "roll":
            let num1 = Math.floor(Math.random()*6) + 1;
            let num2 = Math.floor(Math.random()*6) + 1;
            message.channel.send(printDiceRoll(num1, num2));
            message.channel.send(num1 + num2);
            break;
        case "flip":
            let flip = Math.floor(Math.random()*2);
            let result = (flip == 1) ? "Heads" : "Tails";
            message.channel.send(result);
            break;
        case "help":
            message.channel.send(helpEmbed);
            break;
        default:
            message.channel.send("Invalid command");

    }
});

function getDurationString(seconds) {
    var result = "";
    var hrs;
    var mins;
    var secs = "" + seconds % 60;

    if (seconds > 3600) {
        hrs = Math.floor(seconds / 3600) + ":";
        result += hrs;
    }
    else if(seconds > 60) {
        mins = Math.floor(seconds / 60) % 60 + ":";
        if(hrs != null && mins.length < 3)
            mins = "0" + mins;
    }
    else {
        mins = "0:";
    }

    if(secs.length < 2)
        secs = "0" + secs;

    result += mins + secs;
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