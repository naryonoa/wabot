const {
    WAConnection,
    MessageType,
    MessageOptions,
    Presence,
    Mimetype,
    WALocationMessage,
    WA_MESSAGE_STUB_TYPES,
    ReconnectMode,
    ProxyAgent,
    waChatKey,
} = require("@adiwajshing/baileys");
const http = require("http");
const https = require("https");
var qrcode = require('qrcode');
const fs = require("fs");
const { body, validationResult } = require('express-validator');
const express = require('express');
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
//const socketIO = require('socket.io');
const { phoneNumberFormatter } = require('./helper/formatter');
const io = new Server(server);
//const io = socketIO(server);
// koneksi database
const mysql = require('mysql');
const request = require('request');
const { json } = require("express");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cron = require('node-cron');
const fetch = require('node-fetch');
const { servers, yta, ytv } = require('./lib/y2mate');
const yts = require('yt-search')
const date = new Date();
const main_domain = 'https://whangsaf.ridped.com' //ganti dengan url domain Anda
app.get('*', function(req, res) {
    res.redirect(main_domain); 
});
//konfigurasi koneksi
const db = mysql.createConnection({
  host: 'localhost',
  user: 'ridpedco',
  password: '',
  database: 'ridpedco_whangsaf'
});
 
//connect ke database
db.connect((err) =>{
  if(err) throw err;
  console.log('Mysql Connected...');
});
const web_api = 'https://www.ridped.com/' // web_api free dari ridped.com. ditunggu fitur api lainya:)
const configs = {
    port: 3000, // custom port to access server
    url_callback : main_domain + '/helper/callback.php'
};

const sessions = [];
const SESSIONS_FILE = './sesi-whangsaf.json';
const mkZap = async (id) => {
  
    const conn =  new WAConnection()
    conn.autoReconnect = ReconnectMode.onConnectionLost // only automatically reconnect when the connection breaks
    conn.connectOptions.alwaysUseTakeover = true
     conn.version = [2, 2142, 12];
     await conn.loadAuthInfo(`./sesi-whangsaf-${id}.json`)
    if (conn.state == 'open'){
        return conn;
    } else {

        await conn.connect()
        return conn
    }

  }
cron.schedule("3 * * * *", function() {
  console.log('cronjob berjalan')
 // console.log('ada init')
  const savedSessions = getSessionsFile();
      savedSessions.forEach(sess => {
          mkZap(sess.id);
          if(sess.ready == true){
console.log(sess.id)
              createSession(sess.id);
          } else {
              mkZap(sess.id);
          }
      }); 
});
const createSessionsFileIfNotExists = function () {
    if (!fs.existsSync(SESSIONS_FILE)) {
        try {
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
            console.log('Sessions file created successfully.');
        } catch (err) {
            console.log('Failed to create sessions file: ', err);
        }
    } 
}
createSessionsFileIfNotExists();
const setSessionsFile = function (sessions) {
    fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), function (err) {
        if (err) {
            console.log(err);
        }
    });
} 
const getSessionsFile = function () {
    
    return JSON.parse(fs.readFileSync(SESSIONS_FILE));
}
const createSession = function (id) {

    const conn = new WAConnection();
    conn.autoReconnect = ReconnectMode.onConnectionLost // only automatically reconnect when the connection breaks
    conn.connectOptions.alwaysUseTakeover = true
    conn.version = [2, 2142, 12];
    conn.setMaxListeners(0);
    console.log('Creating session: ' + id);
    const SESSION_FILE_PATH = `./sesi-whangsaf-${id}.json`;
    let sessionCfg;
    if (fs.existsSync(SESSION_FILE_PATH)) {
        sessionCfg = require(SESSION_FILE_PATH);
        conn.loadAuthInfo(`./sesi-whangsaf-${id}.json`)
       if(conn.state == 'open'){
        io.emit('message', { id: id, text: 'Whatsapp is ready!' });
        io.emit('authenticated',  { id: id, data : conn.user})
        return conn;
        } else if( conn.state == 'connecting') {
            return;
    }
}
global.conn = conn
conn.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
        io.emit('qr', { id: id, src: url });
        io.emit('message', { id: id, text: 'QR Code received, scan please!' });
    });
    conn.removeAllListeners('qr');
});

conn.connect(); 
// conn.on('initial-data-received',function(){
//     console.log('aaaaaaaaaaa')
// }) 
conn.on('open', (result) => {
    const session = conn.base64EncodedAuthInfo()
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('berhasil buat');
        }
    });
    console.log(session);
    io.emit('ready', { id: id });
    io.emit('message', { id: id, text: 'Whatsapp is ready!' });
    io.emit('authenticated',  { id: id, data : conn.user})
    const savedSessions = getSessionsFile();
    const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
    savedSessions[sessionIndex].ready = true;
    setSessionsFile(savedSessions);
	socket.on('balaspesan', function (res) {
		const number = phoneNumberFormatter(res.number);
		const message = res.message;
		conn.sendMessage(number, message, MessageType.text).then(response => {
			console.log('berhasil')
		}).catch(err => {
			console.log('gagal')
		});

	});
    

});
// conn.on('initial-data-received',function(){
//     console.log('sfdsf');
// })

conn.on('close', ({ reason }) => {
	if (reason == 'invalid_session') {
    const nomors =  phoneNumberFormatter(conn.user.jid);
    const nomor = nomors.replace(/\D/g, '');
    console.log(nomor)
        if (fs.existsSync(`./sesi-whangsaf-${nomor}.json`)) {
            fs.unlinkSync(`./sesi-whangsaf-${nomor}.json`);
            io.emit('close', { id: nomor, text: 'Connection Lost..' });
            const savedSessions = getSessionsFile();
            const sessionIndex = savedSessions.findIndex(sess => sess.id == nomor);
            savedSessions[sessionIndex].ready = false;
            //setSessionsFile(savedSessions);
            setSessionsFile(savedSessions);          
	}
	}
})
// Menambahkan session ke file
// Tambahkan client ke sessions
sessions.push({
    id: id,
});
// Menambahkan session ke file
const savedSessions = getSessionsFile();
const sessionIndex = savedSessions.findIndex(sess => sess.id == id);

if (sessionIndex == -1) {
    savedSessions.push({
        id: id,
        ready: false,
    });
    setSessionsFile(savedSessions);
}

conn.on('initial-data-received', async () => {
    console.log('initialize');
    request({ url: configs.url_callback, method: "POST", json: {"id" : conn.user.jid ,"data" : conn.contacts} })
})

// chat masuk
conn.on('chat-update', async chat => {
const numb =  phoneNumberFormatter(conn.user.jid);
const mynumb = numb.replace(/\D/g, '');
//hook
if (chat.messages || chat.count) {
        const m = chat.messages.all()[0] // pull the new message from the update
        let sender = m.key.remoteJid
        let frome = m.key.fromMe
        const messageContent = m.message
        const messageType = Object.keys(messageContent)[0]
if(messageType == 'conversation' ){
    var sender2 = ''
    if (sender.endsWith('@g.us') == true) {
        if (frome == 0) {
            sender2 += m.participant
        } else {
            sender2 += conn.user.jid
        }
    }
    var text = m.message.conversation
} else if(messageType == 'extendedTextMessage' ){
    var sender2 = ''
    if (sender.endsWith('@g.us') == true) {
        sender2 += m.message.extendedTextMessage.contextInfo.participant
    }
   var text = m.message.extendedTextMessage.text
} else if(messageType == 'imageMessage'){
   var text = m.message.imageMessage.caption
} else if(messageType == 'buttonsResponseMessage'){
   var text = m.message.buttonsResponseMessage.selectedButtonId
}
/*if (sender.textlength < 15) {
    return;
} */

let sqlhook = `SELECT link_webhook FROM device WHERE nomor = ${mynumb} `;
db.query(sqlhook, function (err, result) {
    if (err) throw err;
       const webhookurl = result[0].link_webhook;
       const pesan = {
           sender: phoneNumberFormatter(sender),
           msg: text
       }
		// const mynumber = conn.user.jid.replace(/\D/g,'');
		const sendertw = sender.replace(/\D/g,'');
		const tanggal = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
		const inbox = {
			pesan: text,
			nomor: sendertw,
			nomorsaya: mynumb,
			tanggal: tanggal
		}
		const cekpesan = `SELECT * FROM receive_chat WHERE nomor = '${sendertw}' AND nomor_saya = '${mynumb}' `;
		db.query(cekpesan, function (err, result) {
			if (err) throw err;
			if (result[0] == undefined) {
				io.emit('pesanbaru', 'inbox')
			}
			io.emit('inbox', inbox)
		});
      kirimwebhook(sender, text, m,conn,webhookurl,mynumb,frome);
});
// end hook
//autoreply
let sqlautoreply = `SELECT * FROM autoreply WHERE keyword = "${text}" AND nomor = "${mynumb}"`;
db.query(sqlautoreply, function (err, result) {
    if (err) throw err;
    result.forEach(data => {
             if(data.media == ''){
                let gs = getNama(sender,global.conn)
                if (data.response.includes('[nama]') == true) {
                    data.response = data.response.replace('[nama]', gs)
                }
                 conn.sendMessage(sender, data.response, MessageType.text);
             } else {
                 let gs = getNama(sender,global.conn)
                 var media = `${data.media}`;
                 const ress = data.response
                 if (ress.includes('[nama]') == true) {
                     ress = ress.replace('[nama]', gs)
                 }
              const array = media.split(".");
              const ext = array[array.length - 1];
                 if(ext == 'jpg' || ext == 'png'){
                     let options = { mimetype: 'image/jpeg' , caption: ress, filename: "file.jpeg" };
                     conn.sendMessage(sender, {url: media}, MessageType.image, options);
                 } else if (ext == 'pdf'){
                    const getlink = media.split("/");
                    const namefile = getlink[getlink.length - 1]
                    const link = `./pages/uploads/${namefile}`
                    conn.sendMessage(sender, { url: link }, MessageType.document, { mimetype: Mimetype['pdf'],filename : namefile })
                 }
             }
});
});
// simple aja :v. kembangin lagi gan:v
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
const text_lod = 'tunggu sebentar...';
// text maker
if (text.startsWith('glow') == true) {
    let ct = text.replace('glow ', '')
    if (text.length < 6 || ct.length < 3) {
        return conn.sendMessage(sender, 'Cth format : glow ridped\nDan textnya harus lebih dari 3 karakter!', MessageType.extendedText, { quoted: m })
    }
    conn.sendMessage(sender, text_lod, MessageType.extendedText, { quoted: m })
    try {
        let options = { quoted: m, mimetype: 'image/jpeg' , caption: 'Nich', filename: "file.jpeg" };
        return conn.sendMessage(sender, {url: `${web_api}api?fitur=glow&text=${ct}`}, MessageType.image, options)
    } catch(e) {
        return conn.sendMessage(sender, e, MessageType.extendedText, { quoted: m })
    }
 // downloader
} else if (text.startsWith('yta') == true) {
    let args = text.replace('yta ', '')
    if (text.length < 5 || args.length < 3) {
        return conn.sendMessage(sender, 'Format salah!\nCth format : yta https://www.youtube.com/watch?v=yxDdj_G9uRY // link youtube nya', MessageType.extendedText, { quoted: m })
    }
    let server = (args || servers[0]).toLowerCase()
    let { dl_link, thumb, title, filesize, filesizeF } = await yta(args, servers.includes(server) ? server : servers[0])
    let isLimit = (30) * 1024 < filesize
    if (!isLimit) {
        conn.sendMessage(sender, text_lod, MessageType.extendedText, { quoted: m})
        let options = { quoted: m, mimetype: Mimetype.mp4Audio };
        return conn.sendMessage(sender, {url: dl_link}, MessageType.audio, options)
    } else {
        return conn.sendMessage(sender, 'Maaf link di atas 30 MB.\nSilahkan Download manual melalui browser dengan tap link ini : ' + dl_link)
    }
} else if (text.startsWith('ytv') == true) {
    let args = text.replace('ytv ', '')
    if (text.length < 5 || args.length < 3) {
        return conn.sendMessage(sender, 'Format salah!\nCth format : ytv https://www.youtube.com/watch?v=yxDdj_G9uRY // link youtube nya', MessageType.extendedText, { quoted: m })
    }
    let server = (args || servers[0]).toLowerCase()
    let { dl_link, thumb, title, filesize, filesizeF } = await ytv(args, servers.includes(server) ? server : servers[0])
    let isLimit = (30) * 1024 < filesize
    if (!isLimit) {
        conn.sendMessage(sender, text_lod, MessageType.extendedText, { quoted: m})
        let options = { quoted: m, mimetype: 'video/mp4', filename: title + '.mp4' };
        return conn.sendMessage(sender, {url: dl_link}, MessageType.video, options)
    } else {
        return conn.sendMessage(sender, 'Maaf link di atas 30 MB.\nSilahkan Download manual melalui browser dengan tap link ini : ' + dl_link)
    }
} else if (text.startsWith('play') == true) {
    let args = text.replace('play  ', '')
    if (text.length < 6 || args.length < 3) {
        return conn.sendMessage(sender, 'Format salah!\nCth format : play alone', MessageType.extendedText, { quoted: m })
    }
    conn.sendMessage(sender, text_lod, MessageType.extendedText, { quoted: m})
    let results = await yts(args)
    let vid = results.all.find(video => video.seconds < 3600)
    if (!vid) return conn.sendMessage(sender, args + ' Tidak ditemukan di youtube!', MessageType.extendedText, { quoted: m })
    let yt = false
    let yt2 = false
    let usedServer = servers[0]
    for (let i in servers) {
        let server = servers[i]
        try {
            yt = await yta(vid.url, server)
            yt2 = await ytv(vid.url, server)
            usedServer = server
            break
        } catch (e) {
            conn.sendMessage(sender, `Server ${server} error!${servers.length >= i + 1 ? '' : '\nmencoba server lain...'}`, MessageType.extendedText, { quoted: m})
        }
    }
    if (yt === false) conn.sendMessage(sender, 'semua server gagal', MessageType.extendedText, { quoted: m})
    if (yt2 === false) conn.sendMessage(sender, 'semua server gagal', MessageType.extendedText, { quoted: m})
    let { dl_link, thumb, title, filesize, filesizeF } = yt
    let caption = `*Judul:* ${title}
*Size audio file:* ${filesizeF}
*Size Video file:* ${yt2.filesizeF}`
    let options = { quoted: m, mimetype: 'image/jpeg' , caption: caption, filename: "file.jpeg" };
    conn.sendMessage(sender, {url: thumb}, MessageType.image, options)
    const buttonMessage = {
        contentText: "Choose audio or video to download",
        footerText: 'www.ridped.com',
        buttons: [
            {buttonId: `yta ${vid.url}`, buttonText: {displayText: 'Audio'}, type: 1},
            {buttonId: `ytv ${vid.url}`, buttonText: {displayText: 'Video'}, type: 1}
        ],
        headerType: 1
    }
    await sleep(3000)
    return conn.sendMessage(sender, buttonMessage, MessageType.buttonsMessage)
} else if (text == 'justtest') {
    var namanya = ''
    if (!sender2 ) {
        namanya = getNama(sender,global.conn)
    } else {
        namanya = getNama(sender2,global.conn)
    }
    return conn.sendMessage(sender, 'oy ' + namanya, MessageType.text)
} else if (text.startsWith('test') == true) {
    const buttonMessage = {
        contentText: "Simple button :v",
        footerText: 'Hello World',
        buttons: [
            {buttonId: 'asw', buttonText: {displayText: 'Hubungi angmin'}, type: 1}
        ],
        headerType: 1
    }
    return conn.sendMessage(sender, buttonMessage, MessageType.buttonsMessage)
}
        }
   })
   
conn.on('group-participants-update', async ({ jid, participants, action }) => {
    let text = ''
    switch (action) {
        case 'add':
        case 'remove':
        let groupMetadata = await conn.groupMetadata(jid)
        for (let user of participants) {
            let pp = 'https://www.ridped.com/api?fitur=glow&text=ridped'
            try {
                pp = await conn.getProfilePicture(user)
            } catch (e) {
            } finally {
                text = (action === 'add' ? ('Selamat datang, @user! di @subject\n\n @desc').replace('@subject', groupMetadata.subject).replace('@desc', groupMetadata.desc) :
                ('Bye, @user!')).replace('@user', '@' + user.split('@')[0])
                let options = { mimetype: 'image/jpeg' , caption: text, filename: "file.jpeg" };
                conn.sendMessage(jid, {url: pp}, MessageType.image, options, {
                    contextInfo: {
                        mentionedJid: [user]
                    }
                })
            }
        }
    }
})
    
}
//init
const init = function (socket) {
    const savedSessions = getSessionsFile();
        savedSessions.forEach(sess => {
            if(sess.ready == true){
console.log(sess.id)
                createSession(sess.id);
            }
        });
  }
  
  init();
// koneksi socket
io.on('connection', function (socket) {
    init(socket);
// membuat session
    socket.on('create-session', function (data) {
        console.log(data)
        console.log('Create session: ' + data.id);
        createSession(data.id);
    });
//
    // ini baris untuk logout
    socket.on('logout',async function (data) {
        if (fs.existsSync(`./sesi-whangsaf-${data.id}.json`)) {
            socket.emit('isdelete', { id : data.id, text :'<h2 class="text-center text-info mt-4">Logout Success, Lets Scan Again<h2>' })
          fs.unlinkSync(`./sesi-whangsaf-${data.id}.json`);
            const savedSessions = getSessionsFile();
            const sessionIndex = savedSessions.findIndex(sess => sess.id == data.id);
            savedSessions[sessionIndex].ready = false;
            //setSessionsFile(savedSessions);
            setSessionsFile(savedSessions);
        } else {
            socket.emit('isdelete', { id : data.id, text : '<h2 class="text-center text-danger mt-4">You are have not Login yet!<h2>'})
        }
    })
    // 
});

// Send message
app.post('/send-message', async (req, res) => {
    const sender = req.body.sender;
    if (fs.existsSync(`sesi-whangsaf-${sender}.json`)) {
    const client = await mkZap(sender);
    if (req.body.number.length > 15) {
		var number = req.body.number; 
    } else {
        var number = phoneNumberFormatter(req.body.number);
        var numberExists = await client.isOnWhatsApp(number);
		if (!numberExists) {
			return res.status(422).json({
				status: false,
				message: 'The number is not registered'
			});
		}
    }
    let nomornya = number.replace('@c.us', '@s.whatsapp.net');
    let gs = getNama(nomornya,global.conn)
   // var number = phoneNumberFormatter(req.body.number);
    var message = req.body.message;
    if (message.includes('[nama]') == true) {
        var message = message.replace('[nama]', gs)
    }

 if(client.state == 'open'){
    client.sendMessage(number, message, MessageType.text).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
    } else {
        res.status(500).json({
            status: false,
            response: 'Please scan the QR before use this API'
        });
    }
} else {
    res.writeHead(401, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
        status: false,
        message: 'Please scan the QR before use the API 2'
    }));
}
}); 

// send media
app.post('/send-media', async (req, res) => {
    const sender = req.body.sender;
    if (fs.existsSync(`sesi-whangsaf-${sender}.json`)) {
        const client = await mkZap(sender);
    if (req.body.number.length > 18) {
		var number = req.body.number; 
    } else {
        var number = phoneNumberFormatter(req.body.number);
        var numberExists = await client.isOnWhatsApp(number);
		if (!numberExists) {
			return res.status(422).json({
				status: false,
				message: 'The number is not registered'
			});
		}
    }
        const url = req.body.url;
        const filetype = req.body.filetype;
        const filename = req.body.filename;
        let nomornya = number.replace('@c.us', '@s.whatsapp.net');
        let gs = getNama(nomornya,global.conn)
        var caption = req.body.caption;
        if (caption.includes('[nama]') == true) {
            var caption = caption.replace('[nama]', gs)
        }
  //  var number = phoneNumberFormatter(req.body.number);
  //  const message = req.body.message;

  
if(client.state == 'open'){
 if (filetype == 'jpg' || filetype == 'png') {
       console.log(filetype)
        let options = { mimetype: 'image/jpeg' , caption: caption, filename: filename };
        client.sendMessage(number, {url: url}, MessageType.image, options).then(response => {
            res.status(200).json({
                status: true,
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                response: err
            });
        });

    } else if (filetype == 'pdf') {
        client.sendMessage(number, { url: url }, MessageType.document, { mimetype: Mimetype['pdf'],filename : filename + '.pdf' }).then(response => {
            return res.status(200).json({
                status: true,
                response: response
            });
        }).catch(err => {
            return res.status(500).json({
                status: false,
                response: err
            });
        });
    } else {
        res.status(500).json({
            status: false,
            response: 'Filetype tidak dikenal'
        });
    }
    } else {
        res.status(500).json({
            status: false,
            response: 'Please scan the QR before use this API'
        });
    }
} else {
    res.writeHead(401, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
        status: false,
        message: 'Please scan the QR before use the API 2'
    }));
}
});



//function kebutuhan webhook
function kirimwebhook(sender, message, m ,conn,link,mynumb,frome) {
   
	var webhook_response = {
		from: phoneNumberFormatter(sender),
		message: message,
		yey: mynumb,
		frome: frome
	}
	const getBuffer = async (url, options) => {
		try {
			options ? options : {}
			const res = await axios({
				method: "get",
				url,
				...options,
				responseType: 'arraybuffer'
			})
			return res.data
		} catch (e) {
			console.log(`Error : ${e}`)
		}
	}

	request({ url: link, method: "POST", json: webhook_response },
		async function (error, response) {
			if (!error && response.statusCode == 200) {
				// process hook
				if (response.body == null) {
					return 'gagal send webhook';
				}
				const res = response.body;
				console.log(res);
				if (res.mode == 'chat') {
					conn.sendMessage(sender, res.pesan, MessageType.text)
				} else if (res.mode == 'reply') {
					conn.sendMessage(sender, res.pesan, MessageType.extendedText, { quoted: m })
				} else if (res.mode == 'picture') {
					const url = res.data.url;
					const caption = res.data.caption;
					var messageOptions = {};
					const buffer = await getBuffer(url);
					if (caption != '') messageOptions.caption = caption;
					conn.sendMessage(sender, buffer, MessageType.image, messageOptions);
				}
			} else { console.log('error'); }
		}
	);
}
function getNama(sender,conn) {
        withoutContact = conn.withoutContact || false
        let chat
        let v = sender.endsWith('@g.us') ? (chat = conn.chats.get(sender) || {}) || conn.groupMetadata(sender) || {} : sender === '0@s.whatsapp.net' ? {
            sender,
            vname: 'WhatsApp'
        } : sender === conn.user.jid ?
        conn.user :
        conn.contactAddOrGet(sender)
        return (withoutContact ? '' : v.name) || v.subject || v.vname || v.notify || ('')
}
/*function kirimwebhook2(psn) {
   
	var webhook_response2 = {
		from: psn
	}

	request({ url: "https://whangsaf.ridped.com/filewebhook/hook.php", method: "POST", json: webhook_response2 },
		async function (error, response) {
			if (!error && response.statusCode == 200) {
				// process hook
				if (response.body == null) {
					return 'gagal send webhook';
				}
			} else { console.log('error'); }
		}
	);
}*/



server.listen(configs.port, function () {
    console.log('App running on *: ' + configs.port);
});


