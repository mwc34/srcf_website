const client_path = '../../public_html/botc/'
const fs = require("fs")
const path = require("path")
var io = null

// Copy state
function copy(state) {
    let new_state = {}
    if (state && state.constructor == Object && (
            'night_actions' in state ||
            'game_timeout' in state ||
            'hostless_timeout' in state ||
            'clientless_timeout' in state)) {
        for (let i in state) {
            if (i != 'night_actions' &&
                i != 'game_timeout' &&
                i != 'hostless_timeout' &&
                i != 'clientless_timeout') {
                new_state[i] = state[i]
            }
            else if (i == 'night_actions') {
                new_state[i] = {}
            }
            else {
                new_state[i] = null
            }
        }
    }
    else {
        new_state = state
    }
    return JSON.parse(JSON.stringify(new_state))
}

// Emit to all sockets in channel
function channelEmit(channel_id, eventName, msg, emitToHost = true) {
    let state = game_states[channel_id]
    if (state.host_socket_id != null && emitToHost) {
        io.to(state.host_socket_id).emit(eventName, msg)
    }
    for (let player of state.player_info) {
        if (player.socket_id != null) {
            io.to(player.socket_id).emit(eventName, msg)
        }
    }
    for (let spectator of state.spectators) {
        io.to(spectator).emit(eventName, msg)
    }
}

// Censor state
function censorState(state, socket_id = false) { // undefined clashes with player.socket_id = null
    state = copy(state)
    
    for (let player of state.player_info) {
        if (player.socket_id != socket_id && state.host_socket_id != socket_id) {
            if (!player.character || getCharacterFromID(state, player.character).team != 'traveler') {
                player.character = null
            }   
            player.reminders = []
        }
        player.socket_id = (player.socket_id == null) ? false : true
    }
    state.demon_bluffs = (state.host_socket_id == socket_id) ? state.demon_bluffs : []
    state.host_socket_id = (state.host_socket_id == null) ? false : true
    
    
    delete state.spectators
    delete state.night_actions
    delete state.hostless_timeout
    delete state.game_timeout
    delete state.clientless_timeout
    delete state.roles_by_id
    delete state.ip
    state.group_night_action = {'name' : null, 'data' : {}}
    
    return state
}

function getCharacterFromID(state, id) {
    if (id in roles_by_id) {
        return roles_by_id[id]
    }
    
    if (state.roles.length > 0 && Object.keys(state.roles_by_id).length == 0) {
        for (let role of state.roles) {
            state.roles_by_id[role.id] = role
        }
    }
    if (id in state.roles_by_id) {
        return state.roles_by_id[id]
    }
    return null
}

function getEditionFromID(state, id) {
    if (id in editions_by_id) {
        return editions_by_id[id]
    }
    
    for (let edition of state.editions) {
        if (edition.id == id) {
            return edition
        }
    }
    
    return null
}

function getFabledFromID(state, id) {
    if (id in fabled_by_id) {
        return fabled_by_id[id]
    }
    
    for (let fabled of state.fabled) {
        if (fabled.id == id) {
            return fabled
        }
    }
    return null
}

// Get player info by seat
function getPlayerBySeat(state, seat) {
    for (let player of state.player_info) {
        if (player.seat == seat) {
            return player
        }
    }
    return null
}

// Get player info by seat_id
function getPlayerBySeatID(state, seat_id) {
    for (let player of state.player_info) {
        if (player.seat_id == seat_id) {
            return player
        }
    }
    return null
}

// Get player info by name
function getPlayerByName(state, name) {
    for (let player of state.player_info) {
        if (player.name == name) {
            return player
        }
    }
    return null
}

// Get player info by socket_id
function getPlayerBySocketID(state, socket_id) {
    for (let player of state.player_info) {
        if (player.socket_id == socket_id) {
            return player
        }
    }
    return null
}

// Print Info
function printInfo() {
    let games = Object.keys(game_states).length
    let hosts = 0
    let players = 0
    let spectators = 0
    let total_clients = Object.keys(io.sockets).length
    for (let key in game_states) {
        hosts += Boolean(game_states[key].host_socket_id)
        players += game_states[key].player_info.reduce((a, b) => {return a + Boolean(b.socket_id)}, 0)
        spectators += game_states[key].spectators.length
    }
    console.log(`[BOTC] Currently, ${games} game${games != 1 ? 's' : ''} ${games != 1 ? 'are' : 'is'} running with ${hosts} host${hosts != 1 ? 's' : ''}, ${players} player${players != 1 ? 's' : ''}, ${spectators} spectator${spectators != 1 ? 's' : ''} giving ${total_clients} connection${total_clients != 1 ? 's' : ''} in total.`)
}

function endGame(channel_id) {
    if (!(channel_id in game_states)) {return}
    
    let state = game_states[channel_id]
    
    // Disconnect
    if (state.host_socket_id) {
        io.sockets[state.host_socket_id].disconnect()
    }
    
    for (let p of state.player_info) {
        if (p.socket_id) {
            io.sockets[p.socket_id].disconnect()
        }
    }
    
    for (let s of state.spectators) {
        io.sockets[s].disconnect()
    }
    
    // Clear timeouts
    if (state.game_timeout) {
        clearTimeout(state.game_timeout)
        state.game_timeout = null
    }
    if (state.hostless_timeout) {
        clearTimeout(state.hostless_timeout)
        state.hostless_timeout = null
    }
    
    if (state.clientless_timeout) {
        clearTimeout(state.clientless_timeout)
        state.clientless_timeout = null
    }
    
    let ip = game_states[channel_id].ip
    
    if (ip in ip_games) {
        ip_games[ip]--
        if (ip_games[ip] == 0) {
            delete ip_games[ip]
        }
    }
    
    delete game_states[channel_id]
    printInfo()
}

function rateLimit(socket) {
    let ip = socket.request.headers['x-forwarded-for']
    
    // Initialise
    if (!socket.rate_limit_requests) {
        socket.rate_limit_requests = {
            'time' : null,
            'count' : null,
        }
    }
    
    // Update if behind
    if (socket.rate_limit_requests.time != requests_timer.time) {
        if (!requests_timer.requested) {
            // Set a timer
            setTimeout(() => {
                requests_timer.time++
                requests_timer.requested = false
            }, 1000)
            requests_timer.requested = true
        }
        socket.rate_limit_requests.time = requests_timer.time
        socket.rate_limit_requests.count = 0
    }
    
    // False if too many socket requests
    if (socket.rate_limit_requests.count == max_requests) {
        return false
    }
    
    // Initialise
    if (!(ip in ip_requests)) {
        ip_requests[ip] = {
            'time' : null,
            'count' : null,
        }
    }
    
    // Update if behind
    if (ip_requests[ip].time != requests_timer.time) {
        ip_requests[ip].time = requests_timer.time
        ip_requests[ip].count = 0
    }
    
    // False if too many ip requests
    if (ip_requests[ip].count == max_ip_requests) {
        return false
    }
    
    // Increment
    socket.rate_limit_requests.count++
    ip_requests[ip].count++
    
    return true
}
const log_status_count = 4

const max_new_editions = 5

const max_new_fabled_per_edition = 5

const max_reminders = 5

const max_players = 20

const max_spectators = 20

const game_timeout = 1000 * 3600 * 24 // 24 Hours

const hostless_timeout = 1000 * 3600 // Hour

const clientless_timeout = 1000 * 300 // 5 minutes

const max_games = 100

const max_ip_games = 5

const max_ip_connections = max_ip_games * (max_players + 1)

const max_requests = 5 // Per second

const max_ip_requests = max_requests * max_ip_connections

const ip_connections = {} // ip -> count

const ip_games = {} // ip -> count

const ip_requests = {} // ip -> {time, count}

const requests_timer = {
    'time' : 0,
    'requested' : false,
}

// Roles json

const roles_by_id = {}

const base_roles = JSON.parse(fs.readFileSync(client_path + 'json/roles.json', 'utf8'));

for (let role of base_roles) {
    roles_by_id[role.id] = role
}

const editions_by_id = {}

const base_editions = JSON.parse(fs.readFileSync(client_path + 'json/editions.json', 'utf8'));

for (let edition of base_editions) {
    editions_by_id[edition.id] = edition
}

const fabled_by_id = {}

const base_fabled = JSON.parse(fs.readFileSync(client_path + 'json/fabled.json', 'utf8'));

for (let fabled of base_fabled) {
    fabled_by_id[fabled.id] = fabled
}

// Game Data, one for each channel id

const game_states = {}

const base_state = {
    'host_socket_id' : null,
    'hostless_timeout' : null,
    'game_timeout' : null,
    'clientless_timeout' : null,
    'ip' : null,
    'spectators' : [],
    'night_actions' : {},
    'roles_by_id' : {},
    'group_night_action' : {
        'name' : null,
        'data' : {}, // seat_id : {'players' : []}
    },
    'next_seat_id' : 0,
    'log_status' : 0,
    'edition' : 'tb',
    'editions' : [],
    'roles' : [],
    'fabled' : [],
    'fabled_in_play' : [],
    'demon_bluffs' : [],
    'player_info' : [],
    'clock_info' : {
        'nominator' : null,
        'nominatee' : null,
        'interval' : 2000, // Milliseconds
        'start_time' : null,
        'active' : false,
        'free' : false,
    },
    'day_phase' : false,
    'phase_counter' : 0,
    'nominations_open' : false,
}

const base_player_info = {
    'name' : null,
    'seat' : null,
    'seat_id' : null,
    'socket_id' : null,
    'alive' : true,
    'character' : null,
    'nominated' : false,
    'nominateed' : false,
    'dead_vote' : true,
    'reminders' : [],
    'voting' : false,
    'synced' : true,
    'night_action' : false,
}

function init(i) {
	io = i
	io.on('connection', connection)
}

// Socket Updates
function connection(socket) {
    
    let ip = socket.request.headers['x-forwarded-for']
    
    if (ip_connections[ip] && ip_connections[ip] == max_ip_connections) {
        socket.emit('server message', 'You have reached maximum number of connections for this IP address')
        socket.disconnect()
        return
    }
    
    if (!rateLimit(socket)) {
        socket.disconnect()
        return
    }
    
    if (!(ip in ip_connections)) {
        ip_connections[ip] = 0
    }
    
    ip_connections[ip]++
    
    socket.timeout_to_join_game = setTimeout(() => {
        socket.disconnect()
    }, 5000) // Time to join before kick
    printInfo()
    
    socket.on('manual ping', () => {
        if (!rateLimit(socket)) {return}
        socket.emit('manual pong')
    })
    
    // Host connecting
    socket.on('new host', (channel_id) => {
        if (!rateLimit(socket)) {return}
        
        if (socket.timeout_to_join_game) {
            clearTimeout(socket.timeout_to_join_game)
            socket.timeout_to_join_game = null
        }
        else {
            socket.emit('new host', false, `You are already connected to a different channel or role`)
            return
        }
        
        channel_id = String(channel_id).slice(0, 20)
        
        // Room already taken
        if (channel_id in game_states && game_states[channel_id].host_socket_id != null) {
            socket.emit('new host', false, `Channel ${channel_id} is already in use`)
            socket.disconnect()
        }
        // Room available
        else {
            let new_room = false
            // Make new room
            if (!(channel_id in game_states)) {
                new_room = true
                if (Object.keys(game_states).length == max_games) {
                    socket.emit('new host', false, `There are already the maximum number of games active`)
                    socket.disconnect()
                    return
                }
                else if (ip_games[ip] && ip_games[ip] == max_ip_games) {
                    socket.emit('server message', 'You have reached maximum number of games for this IP address')
                    socket.disconnect()
                    return
                }
                
                if (!(ip in ip_games)) {
                    ip_games[ip] = 0
                }
                
                ip_games[ip]++
                
                game_states[channel_id] = copy(base_state)
                game_states[channel_id].game_timeout = setTimeout(() => {
                    if (channel_id in game_states) {
                        channelEmit(channel_id, 'finish', 'Your game has closed due to it running for too long')
                        game_states[channel_id].game_timeout = null
                        endGame(channel_id)
                    }
                }, game_timeout)
                
                game_states[channel_id].ip = ip
            }
            
            game_states[channel_id].host_socket_id = socket.id
            
            // Timeouts
            if (game_states[channel_id].hostless_timeout) {
                clearTimeout(game_states[channel_id].hostless_timeout)
                game_states[channel_id].hostless_timeout = null
            }
            
            if (game_states[channel_id].clientless_timeout) {
                clearTimeout(game_states[channel_id].clientless_timeout)
                game_states[channel_id].clientless_timeout = null
            }
            
            // Remove from spectators (erroneous)
            if (game_states[channel_id].spectators.includes(socket.id)) {
                game_states[channel_id].spectators.splice(game_states[channel_id].spectators.indexOf(socket.id), 1)
            }
            
            socket.channel_id = channel_id
            
            socket.emit('new host', censorState(game_states[channel_id], socket.id), new_room)
            channelEmit(channel_id, 'host update', true)
            printInfo()
        }
    })
    
    // Player connecting
    socket.on('new player', (channel_id) => {
        if (!rateLimit(socket)) {return}
        
        if (socket.timeout_to_join_game) {
            clearTimeout(socket.timeout_to_join_game)
            socket.timeout_to_join_game = null
        }
        else {
            socket.emit('new player', false, `You are already connected to a different channel or role`)
            return
        }
        
        if (!(channel_id in game_states)) {
            socket.emit('new player', false, `Channel ${channel_id} is not active`)
            socket.disconnect()
        }
        else if (game_states[channel_id].spectators.length == max_spectators) {
            socket.emit('new player', false, `There are already the maximum number of spectators`)
            socket.disconnect()
        }
        else {
            
            if (game_states[channel_id].clientless_timeout) {
                clearTimeout(game_states[channel_id].clientless_timeout)
                game_states[channel_id].clientless_timeout = null
            }
            
            // Send game info
            socket.channel_id = channel_id
            socket.emit('new player', censorState(game_states[channel_id], socket.id))
            if (!game_states[channel_id].spectators.includes(socket.id)) {
                game_states[channel_id].spectators.push(socket.id)
            }
            
            printInfo()
        }
    })
    
    // Sit update
    socket.on('sit update', (channel_id, seat) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states) {
            let player = getPlayerBySeat(game_states[channel_id], seat)
            if (player != null) {
                // Seat free
                if (player.socket_id == null) {
                    player.socket_id = socket.id
                    
                    socket.emit('sit update', player.seat_id)
                    
                    if (game_states[channel_id].spectators.includes(socket.id)) {
                        game_states[channel_id].spectators.splice(game_states[channel_id].spectators.indexOf(socket.id), 1)
                    }
                    
                    if (player.character != null) {
                        socket.emit('character update', {'seat_id' : player.seat_id, 'character' : player.character})
                    }
                    
                    // Update players
                    channelEmit(channel_id, 'socket update', {'seat_id' : player.seat_id, 'socket_id' : true})
                    printInfo()
                }
                // Seat taken
                else {
                    socket.emit('sit update', null)
                }
            }
        }
    })
    
    // Add update(s)
    socket.on('add update', (channel_id, names) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && !game_states[channel_id].clock_info.active) {
            for (let name of names) {
                name = String(name).slice(0, 20)
                if (game_states[channel_id].player_info.length < max_players) {
                    let state = game_states[channel_id]
                    let player = copy(base_player_info)
                    player.seat = state.player_info.length
                    player.seat_id = state.next_seat_id
                    if (name) {
                        // Name available
                        if (getPlayerByName(game_states[channel_id], name) == null) {
                            player.name = name
                        }
                    }

                    
                    state.player_info.push(player)
                    
                    while (getPlayerBySeatID(state, state.next_seat_id)) {
                        state.next_seat_id++
                        if (state.next_seat_id == 2**30) {
                            state.next_seat_id = 0
                        }
                    }
                    
                    channelEmit(channel_id, 'add update', player)
                }
            }
        }
    })
    
    // Name Update
    socket.on('name update', (channel_id, name_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && name_update) {
            let player = getPlayerBySeatID(game_states[channel_id], name_update.seat_id)
            if (player != null) {
                // Name available
                name = String(name_update.name).slice(0, 20)
                if (getPlayerByName(game_states[channel_id], name) == null) {
                    player.name = name
                    channelEmit(channel_id, 'name update', {'seat_id' : player.seat_id, 'name' : player.name})
                }
            }
        }
    })
    
    // Character(s) Update
    socket.on('character update', (channel_id, character_update_list) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && Array.isArray(character_update_list)) {
            for (let character_update of character_update_list) {
                if (character_update && character_update.constructor == Object) {
                    let player = getPlayerBySeatID(game_states[channel_id], character_update.seat_id)
                    let c = getCharacterFromID(game_states[channel_id], character_update.character)
                    if (player != null && (c || !character_update.character)) {
                        // If turning into traveler
                        if (c && c.team == 'traveler') {
                            player.character = c.id
                            channelEmit(channel_id, 'character update', {'seat_id' : player.seat_id, 'character' : player.character})
                        }
                        else {
                            // Use to be a traveler
                            if (player.character && getCharacterFromID(game_states[channel_id], player.character).team == 'traveler') {
                                player.character = character_update.character || null
                                for (let p of game_states[channel_id].player_info) {
                                    if (p.socket_id != null && player.socket_id != p.socket_id) {
                                        io.to(p.socket_id).emit('character update', {'seat_id' : player.seat_id, 'character' : null})
                                    }
                                }
                                for (let spectator of game_states[channel_id].spectators) {
                                    io.to(spectator).emit('character update', {'seat_id' : player.seat_id, 'character' : null})
                                }
                            }
                            else {
                                player.character = character_update.character || null
                            }
                            for (let i of [player.socket_id, game_states[channel_id].host_socket_id]) {
                                if (i != null) {
                                    io.to(i).emit('character update', {'seat_id' : player.seat_id, 'character' : player.character})
                                }
                            }
                        } 
                    }
                }
            }
        }
    })
    
    // Alive update
    socket.on('alive update', (channel_id, alive_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && alive_update) {
            let player = getPlayerBySeatID(game_states[channel_id], alive_update.seat_id)
            if (player != null) {
                player.alive = Boolean(alive_update.alive)
                if (player.alive) {
                    player.dead_vote = true
                }
                channelEmit(channel_id, 'alive update', {'seat_id' : player.seat_id, 'alive' : player.alive}) 
            }
        }
    })
    
    // Edition update
    socket.on('edition update', (channel_id, edition_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id) {
            let edition = getEditionFromID(game_states[channel_id], edition_update)
            if (edition) {
                game_states[channel_id].edition = edition.id
                channelEmit(channel_id, 'edition update', game_states[channel_id].edition)
                game_states[channel_id].fabled_in_play = edition.fabled || []
                channelEmit(channel_id, 'fabled in play update', game_states[channel_id].fabled_in_play)
            }
        }
    })
    
    // Edition Reference Sheet Update
    socket.on('reference sheet update', (channel_id, edition_id, reference_sheet) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && reference_sheet) {
            let edition = getEditionFromID(game_states[channel_id], edition_id)
            
            if (edition && !edition.reference_sheet) {
                edition.reference_sheet = String(reference_sheet).slice(0, 1000)
                if (edition.reference_sheet) {
                    channelEmit(channel_id, 'reference sheet update', {'id' : edition.id, 'reference_sheet' : edition.reference_sheet})
                }
            }
        }
    })
    
    // New Edition update
    socket.on('new edition', (channel_id, edition) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && edition) {
            if (game_states[channel_id].editions.length == max_new_editions) {
                socket.emit('server message', 'You have already added the maximum amount (${max_new_editions}) of new editions to this game. <br> Please restart the session to add another custom edition')
                return
            }
            edition = {
                'id' : edition.id, 
                'name' : edition.name, 
                'characters' : edition.characters,
                'fabled' : edition.fabled,
                'icon' : edition.icon, 
                'reference_sheet' : false
            }
            
            if (!(edition.id 
               && edition.name 
               && edition.characters 
               && edition.characters.constructor == Object 
               && edition.icon 
               && Array.isArray(edition.fabled))) {
                
                return
            }
            // Check unique
            for (let e of game_states[channel_id].editions.concat(base_editions)) {
                if (e.id == edition.id || e.name == edition.name) {
                    return
                }
            }
            
            let max_counts = {
                'townsfolk' : 14,
                'outsider' : 7,
                'minion' : 7,
                'demon' : 7,
                'traveler' : 7,
            }
            
            // Check characters
            let chars_checked = []
            let new_chars = []
            for (let team in edition.characters) {
                if (!(team in max_counts) || !Array.isArray(edition.characters[team])) {
                    return
                }
                for (let i=0; i < edition.characters[team].length; i++) {
                    let id = edition.characters[team][i]
                    let c = getCharacterFromID(game_states[channel_id], id)
                    if (c && (c.team != team || chars_checked.includes(c.id))) {
                        return
                    }
                    // New Character!!
                    if (!c) {
                        if (!id || id.constructor != Object) {
                            return
                        }
                        
                        essential_keys = {
                            'id' : (e) => {return String(e).slice(0, 20)},
                            'name' : (e) => {return String(e).slice(0, 20)},
                            'ability' : (e) => {return String(e).slice(0, 500)},
                            'team' : (e) => {return String(e).slice(0, 20)},
                            'icon' : (e) => {return String(e).slice(0, 1000)},
                        }
                        
                        extra_keys = {
                            'setup' : Boolean,
                            'removesSelf' : Boolean,
                            'firstNight' : (e) => {return Number.isInteger(e) && e >= 0 ? parseInt(e) : 0},
                            'otherNight' : (e) => {return Number.isInteger(e) && e >= 0 ? parseInt(e) : 0},
                            'firstNightReminder' : (e) => {return String(e).slice(0, 1000)},
                            'otherNightReminder' : (e) => {return String(e).slice(0, 1000)},
                            'reminders' : (e) => {return Array.isArray(e) ? e.slice(0, 20).map((x) => {return String(x).slice(0, 50)}) : []},
                            'remindersGlobal' : (e) => {return Array.isArray(e) ? e.slice(0, 20).map((x) => {return String(x).slice(0, 50)}) : []},
                            'nightActions' : (e) => {return Array.isArray(e) ? e.slice(0, 20).map((x) => {
                                if (!x || x.constructor != Object) {
                                    return {}
                                }
                                for (let key in x) {
                                    if (String(key).length > 50) {
                                        delete x[key]
                                    }
                                    else {
                                        if (Array.isArray(x[key])) {
                                            x[key] = x[key].slice(0, 10).map((y) => {return String(y).slice(0, 200)})
                                        }
                                        else {
                                            x[key] = String(x[key]).slice(0, 200)
                                        }
                                    }
                                }
                                return x
                            }) : []},
                            'nightActionsScoped' : (e) => {return Array.isArray(e) ? e.slice(0, 20).map((x) => {
                                if (!x || x.constructor != Object) {
                                    return {}
                                }
                                for (let key in x) {
                                    if (String(key).length > 50) {
                                        delete x[key]
                                    }
                                    else {
                                        if (Array.isArray(x[key])) {
                                            x[key] = x[key].slice(0, 10).map((y) => {return String(y).slice(0, 20)})
                                        }
                                        else {
                                            x[key] = String(x[key]).slice(0, 50)
                                        }
                                    }
                                }
                                return x
                            }) : []},
                        }
                        
                        blank_keys = {
                            'setup' : false,
                            'firstNight' : 0,
                            'otherNight' : 0,
                            'firstNightReminder' : "",
                            'otherNightReminder' : "",
                            'reminders' : [],
                            'nightActions' : [],
                        }
                        
                        new_c = {}
                        for (let key of Object.keys(essential_keys).concat(Object.keys(extra_keys))) {
                            if (key in id) {
                                new_c[key] = key in essential_keys ? essential_keys[key](id[key]) : extra_keys[key](id[key])
                            }
                            else if (key in essential_keys) {
                                return
                            }
                        }
                        
                        for (let key in blank_keys) {
                            if (!(key in new_c)) {
                                new_c[key] = copy(blank_keys[key])
                            }
                        }
                        
                        if (getCharacterFromID(game_states[channel_id], new_c.id)) { 
                            return
                        }
                        
                        if (new_c.team != team) {
                            return
                        }
                        if (chars_checked.includes(new_c.id)) {
                            return
                        }
                        
                        edition.characters[team][i] = new_c.id
                        new_chars.push(new_c)
                        c = new_c
                        
                    }
                    max_counts[team]--
                    chars_checked.push(c.id)
                    if (max_counts[team] < 0) {
                        return
                    }
                }
            }

            // Check fabled
            let fabled_checked = []
            let new_fabled = []
            for (let i=0; i < edition.fabled.length; i++) {
                let f = edition.fabled[i]
                
                if (getFabledFromID(game_states[channel_id], f) && fabled_checked.includes(f)) {
                    return
                }
                if (!getFabledFromID(game_states[channel_id], f)) {
                    if (!f || f.constructor != Object) {
                        return
                    }
                    essential_keys = {
                        'id' : (e) => {return String(e).slice(0, 20)},
                        'name' : (e) => {return String(e).slice(0, 20)},
                        'ability' : (e) => {return String(e).slice(0, 200)},
                        'team' : (e) => {return String(e).slice(0, 20)},
                        'icon' : (e) => {return String(e).slice(0, 1000)},
                    }
                    
                    extra_keys = {
                        'reminders' : (e) => {return Array.isArray(e) ? e.slice(0, 20).map((x) => {return String(x).slice(0, 50)}) : []},
                    }
                    
                    blank_keys = {
                        'reminders' : []
                    }
                    
                    new_f = {}
                    
                    for (let key of Object.keys(essential_keys).concat(Object.keys(extra_keys))) {
                        if (key in f) {
                            new_f[key] = key in essential_keys ? essential_keys[key](f[key]) : extra_keys[key](f[key])
                        }
                        else if (key in essential_keys) {
                            return
                        }
                    }
                    
                    for (let key in blank_keys) {
                        if (!(key in new_f)) {
                            new_f[key] = copy(blank_keys[key])
                        }
                    }
                    
                    if (getFabledFromID(game_states[channel_id], new_f.id)) {
                        socket.emit('server message', `The fabled with id ${new_f.id} already exists`) 
                        return
                    }
                    
                    if (new_f.team != 'fabled') {
                        return
                    }
                    
                    if (fabled_checked.includes(new_f.id)) {
                        return
                    }
                    edition.fabled[i] = new_f.id
                    new_fabled.push(new_f)
                    f = new_f     
                }
                fabled_checked.push(f)
            }
            
            if (new_fabled.length > max_new_fabled_per_edition) {
                socket.emit('server message', `Your edition has too many new fabled (max ${max_new_fabled_per_edition})`)
                return
            }
            
            // Valid new edition
            game_states[channel_id].fabled = game_states[channel_id].fabled.concat(new_fabled)
            game_states[channel_id].roles = game_states[channel_id].roles.concat(new_chars)
            game_states[channel_id].roles_by_id = {}
            game_states[channel_id].editions.push(edition)
            channelEmit(channel_id, 'new edition', {'edition' : edition, 'new_roles' : new_chars, 'new_fabled' : new_fabled})
            game_states[channel_id].edition = edition.id
            channelEmit(channel_id, 'edition update', game_states[channel_id].edition)
            game_states[channel_id].fabled_in_play = edition.fabled || []
            channelEmit(channel_id, 'fabled in play update', game_states[channel_id].fabled_in_play)
        }
    })
    
    // Fabled update
    socket.on('fabled in play update', (channel_id, fabled_in_play) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && Array.isArray(fabled_in_play)) {
            game_states[channel_id].fabled_in_play = fabled_in_play.slice(0, base_fabled.length + game_states[channel_id].fabled.length).filter((e) => {
                return getFabledFromID(game_states[channel_id], e)
            })
            channelEmit(channel_id, 'fabled in play update', game_states[channel_id].fabled_in_play)
        }
    })
    
    // Open Nominations Update
    socket.on('open nominations update', (channel_id, open_update) => {
        if (!rateLimit(socket)) {return}
        let state = game_states[channel_id]
        if (state && socket.id == state.host_socket_id) {
            if (state.day_phase && open_update != state.nominations_open) {
                state.nominations_open = Boolean(open_update)
                channelEmit(channel_id, 'open nominations update', state.nominations_open)
            }
        }
    })
    
    // Seat update
    socket.on('seat update', (channel_id, seat_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && !game_states[channel_id].clock_info.active && seat_update && seat_update.constructor == Object) {
            let new_player_info = copy(game_states[channel_id].player_info)
            let seats_unused = [...Array(new_player_info.length).keys()]
            let to_return = {}

            for (let player of new_player_info) {

                if (player.seat_id in seat_update) {
                    player.seat = parseInt(seat_update[player.seat_id])
                    to_return[player.seat_id] = player.seat
                }

                if (seats_unused.includes(player.seat)) {
                    seats_unused.splice(seats_unused.indexOf(player.seat), 1)
                }
            }

            if (seats_unused.length == 0) {
                game_states[channel_id].player_info = new_player_info
                channelEmit(channel_id, 'seat update', to_return)
            }
        }
    })
    
    // Reminder update
    socket.on('reminder update', (channel_id, reminder_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && game_states[channel_id].host_socket_id == socket.id && reminder_update) {
            let player = getPlayerBySeatID(game_states[channel_id], reminder_update.seat_id)
            if (player != null && reminder_update.reminders && Array.isArray(reminder_update.reminders)) {
                let new_reminders = []
                for (let r of reminder_update.reminders.slice(0, max_reminders)) {
                    new_reminders.push({'icon' : String(r.icon).slice(0, 20), 'text' : String(r.text).slice(0, 50)})
                }
                player.reminders = new_reminders
            }
        }
    })
    
    // Vote update
    socket.on('vote update', (channel_id, vote_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && game_states[channel_id].clock_info.active) {
            let player = getPlayerBySocketID(game_states[channel_id], socket.id)
            if (player != null) {
                let clock_info = game_states[channel_id].clock_info
                
                // Check if not passed their turn
                let curr_time = (new Date()).getTime()
                let segments = game_states[channel_id].player_info.length
                let position = (segments + player.seat - getPlayerBySeatID(game_states[channel_id], clock_info.nominatee).seat) % segments
                position = position == 0 ? segments : position
                let latency_leeway = 50
                let cut_off = position * clock_info.interval + latency_leeway
                if ((clock_info.start_time == null || curr_time - clock_info.start_time < cut_off) && (!(Boolean(vote_update) && !player.alive && !player.dead_vote) || clock_info.free)) {
                    player.voting = Boolean(vote_update)
                    channelEmit(channel_id, 'vote update', {'seat_id' : player.seat_id, 'voting' : player.voting})
                }
            }
        }
    })
    
    // Interval update
    socket.on('interval update', (channel_id, interval_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && game_states[channel_id].host_socket_id == socket.id) {
            // Vote hasn't started
            let clock_info = game_states[channel_id].clock_info
            if (clock_info.start_time == null) {
                clock_info.interval = Number(interval_update)
                channelEmit(channel_id, 'interval update', clock_info.interval)
            }
        }
    })
    
    // Nomination update
    socket.on('nomination update', (channel_id, nomination_update) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && !game_states[channel_id].clock_info.active && game_states[channel_id].day_phase && nomination_update) {
            let state = game_states[channel_id]
            let clock_info = state.clock_info
            // Valid person doing the nomination
            let nominator = getPlayerBySeatID(state, nomination_update.nominator)
            let nominatee = getPlayerBySeatID(state, nomination_update.nominatee)
            if (nominator != null && nominatee != null && (socket.id == state.host_socket_id || (socket.id == nominator.socket_id && state.nominations_open)) && (nominator.alive || nomination_update.free)) {
                // Haven't already nominated/nominateed
                if ((!nominator.nominated && !nominatee.nominateed) || nomination_update.free) {
                    clock_info.nominator = nominator.seat_id
                    clock_info.nominatee = nominatee.seat_id
                    clock_info.active = true
                    clock_info.free = Boolean(nomination_update.free)
                    channelEmit(channel_id, 'nomination update', clock_info)
                }
            }
        }
    })
    
    // Start vote update
    socket.on('start vote update', (channel_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states 
                && game_states[channel_id].host_socket_id == socket.id 
                && game_states[channel_id].clock_info.active 
                && game_states[channel_id].day_phase) {
            
            let clock_info = game_states[channel_id].clock_info
            
            // Vote not already started
            if (clock_info.start_time == null) {
                clock_info.start_time = (new Date()).getTime()
                channelEmit(channel_id, 'start vote update')
            }
        }
    })
    
    // Reset vote update
    socket.on('reset vote update', (channel_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states 
                && game_states[channel_id].host_socket_id == socket.id 
                && game_states[channel_id].clock_info.active 
                && game_states[channel_id].day_phase) {
            
            let clock_info = game_states[channel_id].clock_info
            // Vote started
            if (clock_info.start_time != null) {
                clock_info.start_time = null
                channelEmit(channel_id, 'reset vote update')
            }
        }
    })
    
    // Finish vote update
    socket.on('finish vote update', (channel_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states 
                && game_states[channel_id].host_socket_id == socket.id 
                && game_states[channel_id].clock_info.active 
                && game_states[channel_id].day_phase) {
            
            let state = game_states[channel_id]
            let clock_info = game_states[channel_id].clock_info
            let curr_time = (new Date()).getTime()
            
            // Vote finished
            if (clock_info.start_time != null && (curr_time - clock_info.start_time > clock_info.interval * state.player_info.length)) {
                for (let player of state.player_info) {
                    if (!player.alive && player.dead_vote && player.voting && !clock_info.free) {
                        player.dead_vote = false
                    }
                }
                if (!clock_info.free) {
                    getPlayerBySeatID(state, clock_info.nominator).nominated = true
                    getPlayerBySeatID(state, clock_info.nominatee).nominateed = true
                }
                
                channelEmit(channel_id, 'finish vote update')
            }
            // Vote unfinished
            else {
                channelEmit(channel_id, 'cancel vote update')
            }
            
            // Reset voting
            for (let player of state.player_info) {
                player.voting = false
            }
            
            clock_info.start_time = null
            clock_info.nominatee = null
            clock_info.nominator = null
            clock_info.active = false
            clock_info.free = false
        }
    })
	
	// Manual dead vote removal
    socket.on('dead vote update', (channel_id, seat_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id) {
            let player = getPlayerBySeatID(game_states[channel_id], seat_id)
            if (player != null && !player.alive && player.dead_vote) {
				player.dead_vote = false
                channelEmit(channel_id, 'dead vote update', player.seat_id) 
            }
        }
    })
	
    // Phase update
    socket.on('phase update', (channel_id, day_phase, phase_counter) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && !game_states[channel_id].clock_info.active && Object.getOwnPropertyNames(game_states[channel_id].night_actions).length == 0 && Number.isInteger(phase_counter)) {
            let state = game_states[channel_id]
            phase_counter = parseInt(phase_counter)
            if (state.day_phase != Boolean(day_phase) && Math.abs(state.phase_counter - phase_counter) <= 1 && phase_counter >= 0 && (phase_counter > 0 || !day_phase)) {
                state.day_phase = Boolean(day_phase)
                state.phase_counter = phase_counter
                // Wipe nominations
                if (state.day_phase) {
                    for (let player of state.player_info) {
                        player.nominated = false
                        player.nominateed = false
                    }
                }
                state.nominations_open = false
                channelEmit(channel_id, 'phase update', {'day_phase' : state.day_phase, 'phase_counter' : phase_counter})
            }
        }
    })
    
    // Night Action
    socket.on('night action', (channel_id, night_action) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && !game_states[channel_id].day_phase && night_action && night_action.name) {
            night_action.name = String(night_action.name).slice(0, 40)
            if (socket.id == game_states[channel_id].host_socket_id) {
                let player = getPlayerBySeatID(game_states[channel_id], night_action.seat_id)
                if (player != null && player.socket_id != null && !(player.seat_id in game_states[channel_id].night_actions)) {
                    let info = night_action.info
                    if (info != null) {
                        info = {'characters' : info.characters, 'players' : info.players, 'info' : info.info}
                    }
                    let wait_time = ((night_action.players > 0) + (night_action.characters > 0) + Boolean(night_action.grimoire) + Boolean(night_action.confirm) + 1) * night_action.time
                    if (Number.isInteger(wait_time) 
                                && wait_time > 0 
                                && Number.isInteger(night_action.characters) 
                                && Number.isInteger(night_action.players) 
                                && info != null 
                                && (!night_action.group 
                                        || !game_states[channel_id].group_night_action.name 
                                        || game_states[channel_id].group_night_action.name == night_action.name
                                    )
                            ) {
                        io.to(player.socket_id).emit('night action', {
                            'name' : night_action.name, 
                            'time' : night_action.time, 
                            'characters' : night_action.characters, 
                            'players' : night_action.players, 
                            'info' : info,
                            'grimoire' : (night_action.grimoire), // ? censorState(game_states[channel_id], game_states[channel_id].host_socket_id) : null),
                            'confirm' : (night_action.confirm),
                            'group' : Boolean(night_action.group),
                            'player_restrictions' : night_action.player_restrictions,
                            'character_restrictions' : night_action.character_restrictions})
                        game_states[channel_id].night_actions[player.seat_id] = setTimeout(() => {
                                if (channel_id in game_states) {
                                    let data = game_states[channel_id].group_night_action.data
                                    if (player.seat_id in data) {
                                        delete data[player.seat_id]
                                        io.to(player.socket_id).emit('group night action update', {'name' : null, 'data' : {}})
                                        if (Object.keys(data).length == 0) {
                                            game_states[channel_id].group_night_action.name = null
                                            io.to(game_states[channel_id].host_socket_id).emit('group night action update', {'name' : null, 'data' : {}})
                                        }
                                    }
                                    delete game_states[channel_id].night_actions[player.seat_id]
                                    
                                    io.to(game_states[channel_id].host_socket_id).emit('night action', {'seat_id' : player.seat_id, 'name' : night_action.name, 'server_response' : true, 'info' : {'info' : [player.name + ' didn\'t respond', '']}})
                                }
                            }, wait_time + 5000) // MAGIC NUMBER

                        // Demon Bluffs
                        if (night_action.name == 'Demon Info' && night_action.info && Array.isArray(night_action.info.characters)) {
                            game_states[channel_id].demon_bluffs = night_action.info.characters.slice(0, 3).filter((e) => {
                                return getCharacterFromID(game_states[channel_id], e)
                            })
                            socket.emit('demon bluff update', game_states[channel_id].demon_bluffs)
                        }
                        
                        // Night Actions Processed
                        socket.emit('night action received', night_action.seat_id)
                        
                        
                        if (night_action.group) {
                            if (!game_states[channel_id].group_night_action.name) {
                                game_states[channel_id].group_night_action.name = night_action.name
                            }
                            game_states[channel_id].group_night_action.data[player.seat_id] = {'players' : [], 'characters' : []}
                            for (let seat_id in game_states[channel_id].group_night_action.data) {
                                io.to(getPlayerBySeatID(game_states[channel_id], seat_id).socket_id).emit('group night action update', game_states[channel_id].group_night_action)
                            }
                            if (game_states[channel_id].host_socket_id) {
                                io.to(game_states[channel_id].host_socket_id).emit('group night action update', game_states[channel_id].group_night_action)
                            }
                        }
                    }
                }
                else {
                    io.to(game_states[channel_id].host_socket_id).emit('night action', {'seat_id' : player.seat_id, 'name' : night_action.name, 'server_response' : true, 'info' : {'info' : ['That player doesn\'t exist or is already handling a night action', '']}})
                }
            }
            else if (getPlayerBySocketID(game_states[channel_id], socket.id) != null) {
                let player = getPlayerBySocketID(game_states[channel_id], socket.id)
                if (player.seat_id in game_states[channel_id].night_actions) {
                    clearTimeout(game_states[channel_id].night_actions[player.seat_id])
                    
                    let data = game_states[channel_id].group_night_action.data
                    if (player.seat_id in data) {
                        delete data[player.seat_id]
                        io.to(player.socket_id).emit('group night action update', {'name' : null, 'data' : {}})
                        if (Object.keys(data).length == 0) {
                            game_states[channel_id].group_night_action.name = null
                            io.to(game_states[channel_id].host_socket_id).emit('group night action update', {'name' : null, 'data' : {}})
                        }
                    }
                    
                    delete game_states[channel_id].night_actions[player.seat_id]
                    
                    if (night_action.info != null && night_action.name != null && night_action.seat_id != null) {
                        io.to(game_states[channel_id].host_socket_id).emit('night action', night_action) // TODO Bad Security?
                    }
                    else {
                        io.to(game_states[channel_id].host_socket_id).emit('night action', {'seat_id' : player.seat_id, 'name' : night_action.name, 'server_response' : true, 'info' : {'info' : ['The player didn\'t respond correctly', '']}})
                    }
                }
            }
        }
    })
    
    // Group Night Action Update
    socket.on('group night action update', (channel_id, players) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && Array.isArray(players)) {
            let player = getPlayerBySocketID(game_states[channel_id], socket.id)
            if (player.seat_id in game_states[channel_id].night_actions) {
                let data = game_states[channel_id].group_night_action.data
                if (player.seat_id in data) {
                    data[player.seat_id].players = players.slice(0, max_players).map((e) => {return parseInt(e)})
                    for (let seat_id in data) {
                        io.to(getPlayerBySeatID(game_states[channel_id], seat_id).socket_id).emit('group night action update', game_states[channel_id].group_night_action)
                    }
                    if (game_states[channel_id].host_socket_id) {
                        io.to(game_states[channel_id].host_socket_id).emit('group night action update', game_states[channel_id].group_night_action)
                    }
                }
            }
        }
    })
    
    // Change Log status
    socket.on('log status update', (channel_id, status) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id) {
            if (Number.isInteger(status) && status >= 0 && status < log_status_count && status != game_states[channel_id].log_status) {
                game_states[channel_id].log_status = parseInt(status)
                channelEmit(channel_id, 'log status update', game_states[channel_id].log_status)
            }
        }
    })
    
    // Reveal Grimoire
    socket.on('reveal grimoire', (channel_id, state) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id) {
            channelEmit(channel_id, 'reveal grimoire', state, false)
        }
    })
    
    // Reset Game
    socket.on('reset game', (channel_id, recovery_state) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id) {
            let old_state = game_states[channel_id]
            let state = copy(base_state)
            
            let copy_attributes = [
                'host_socket_id',
                'spectators',
                'roles',
                'fabled',
                'edition',
                'editions',
                'next_seat_id',
            ]
            
            for (let a of copy_attributes) {
                state[a] = old_state[a]
            }

            // From scratch
            if (!recovery_state) {
                for (let i=0; i < old_state.player_info.length; i++) {
                    let p = getPlayerBySeat(old_state, i)
                    let player = copy(base_player_info)
                    player.seat = p.seat
                    player.seat_id = p.seat_id
                    player.name = p.name
                    player.socket_id = p.socket_id
                    
                    state.player_info.push(player)
                }
                
                state.fabled_in_play = getEditionFromID(state, state.edition).fabled || []
            }
            // From recovery state
            else {

                // Base
                state.log_status = Number.isInteger(recovery_state.log_status) && recovery_state.log_status < log_status_count && recovery_state.log_status >= 0 ? recovery_state.log_status : 0
                state.day_phase = Boolean(recovery_state.day_phase)
                state.phase_counter = Number.isInteger(recovery_state.phase_counter) && (recovery_state.phase_counter > 0 || (recovery_state.phase_counter == 0 && !state.day_phase)) ? recovery_state.phase_counter : 0
                state.nominations_open = state.day_phase ? Boolean(recovery_state.nominations_open) : false

                // Edition
                let e = getEditionFromID(state, recovery_state.edition)
                if (e) {
                    state.edition = e.id
                }
                else {
                    return
                }

                // Fabled in play
                if (!Array.isArray(recovery_state.fabled_in_play)) {return}
                for (let fabled of recovery_state.fabled_in_play) {
                    let f = getFabledFromID(state, fabled)
                    if (f) {
                        state.fabled_in_play.push(f.id)
                    }
                }

                // Player info
                if (!Array.isArray(recovery_state.player_info)) {return}
                let seats_remaining = [...Array(recovery_state.player_info.length).keys()]
                let seat_ids_used = []
                for (let p of recovery_state.player_info) {
                    if (!p) {return}

                    let player = copy(base_player_info)
                    
                    player.name = String(p.name).slice(0, 20)
                    
                    let seat = parseInt(p.seat)
                    if (!seats_remaining.includes(seat)) {return}
                    player.seat = seat
                    seats_remaining.splice(seats_remaining.indexOf(seat), 1)
                    
                    let seat_id = parseInt(p.seat_id)
                    if (!Number.isInteger(seat_id) || seat_id < 0 || seat_ids_used.includes(seat_id)) {return}
                    player.seat_id = seat_id
                    seat_ids_used.push(seat_id)
                    state.next_seat_id = Math.max(state.next_seat_id, seat_id+1)
                    player.alive = Boolean(p.alive)
                    player.nominated = Boolean(p.nominated)
                    player.nominateed = Boolean(p.nominateed)
                    player.dead_vote = Boolean(p.dead_vote)
                    
                    let c = getCharacterFromID(state, p.character)
                    player.character = c ? c.id : null
                    
                    if (!Array.isArray(p.reminders)) {return}
                    for (let r of p.reminders) {
                        player.reminders.push({'icon' : String(r.icon).slice(0, 20), 'text' : String(r.text).slice(0, 50)})
                    }
                    
                    state.player_info.push(player)
                }

                // Demon bluffs
                if (!Array.isArray(recovery_state.demon_bluffs)) {return}
                for (let d_b of recovery_state.demon_bluffs) {
                    let c = getCharacterFromID(state, d_b)
                    if (c) {
                        state.demon_bluffs.push(c.id)
                    }
                }

            }
            
            // Clear timeouts
            if (game_states[channel_id].game_timeout) {
                clearTimeout(game_states[channel_id].game_timeout)
                game_states[channel_id].game_timeout = null
            }
            
            if (game_states[channel_id].hostless_timeout) {
                clearTimeout(game_states[channel_id].hostless_timeout)
                game_states[channel_id].hostless_timeout = null
            }
            
            if (game_states[channel_id].clientless_timeout) {
                clearTimeout(game_states[channel_id].clientless_timeout)
                game_states[channel_id].clientless_timeout = null
            }
            
            game_states[channel_id] = state
            
            // Redo timeout timers
            game_states[channel_id].game_timeout = setTimeout(() => {
                if (channel_id in game_states) {
                    channelEmit(channel_id, 'finish', 'Your game has closed due to it running for too long')
                    game_states[channel_id].game_timeout = null
                    endGame(channel_id)
                }
            }, game_timeout)

            // Send it out
            if (state.host_socket_id != null) {
                io.to(state.host_socket_id).emit('reset game', censorState(state, state.host_socket_id))
            }
            channelEmit(channel_id, 'reset game', censorState(state), false)
        }
    })
    
    // Remove update
    socket.on('remove update', (channel_id, seat_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id && !game_states[channel_id].clock_info.active) {
            let state = game_states[channel_id]
            let player = getPlayerBySeatID(state, seat_id)
            if (player != null) {
                channelEmit(channel_id, 'remove update', player.seat_id)
                if (game_states[channel_id].spectators.includes(player.socket_id)) {
                    game_states[channel_id].spectators.push(player.socket_id)
                }
                state.player_info.splice(state.player_info.indexOf(player), 1)
                for (let i = player.seat+1; i <= state.player_info.length; i++) {
                    let t = getPlayerBySeat(state, i)
                    t.seat--
                }
                printInfo()
            }
        }
    })
    
    // Kick update
    socket.on('kick update', (channel_id, seat_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states) {
            let player = getPlayerBySeatID(game_states[channel_id], seat_id)
            if (socket.id == game_states[channel_id].host_socket_id || (player != null && player.socket_id == socket.id)) {
                if (player != null && player.socket_id != null) {
                    let self_kick = socket.id != game_states[channel_id].host_socket_id
                    channelEmit(channel_id, 'kick update', {'seat_id' : player.seat_id, 'self_kick' : self_kick})
                    if (!game_states[channel_id].spectators.includes(player.socket_id)) {
                        game_states[channel_id].spectators.push(player.socket_id)
                    }
                    player.socket_id = null
                    printInfo()
                }
            }
        }
    })
    
    // Host Leave
    // socket.on('host leave', (channel_id) => {
        // if (channel_id in game_states && (socket.id == game_states[channel_id].host_socket_id)) {
            // game_states[channel_id].host_socket_id = null
            // channelEmit(channel_id, 'host update', false)
            // game_states[channel_id].hostless_timeout = setTimeout(() => {
                // channelEmit(channel_id, 'finish', 'Your game has closed due to it not having a host')
                // endGame(channel_id)
            // }, hostless_timeout)
            // socket.disconnect()
        // }
    // })
    
    // Game finish
    socket.on('finish', (channel_id) => {
        if (!rateLimit(socket)) {return}
        if (channel_id in game_states && socket.id == game_states[channel_id].host_socket_id) {
            channelEmit(channel_id, 'finish', 'Your game has closed')
            endGame(channel_id)
        }
    })
    
    // Disconnect
    socket.on('disconnect', () => {
        let connection_exists = false
        if (socket.channel_id && socket.channel_id in game_states) {
            channel_id = socket.channel_id
            
            if (game_states[channel_id].host_socket_id == socket.id) {
                game_states[channel_id].host_socket_id = null
                channelEmit(channel_id, 'host update', false)
                if (game_states[channel_id].hostless_timeout) {
                    clearTimeout(game_states[channel_id].hostless_timeout)
                    game_states[channel_id].hostless_timeout = null
                }
                game_states[channel_id].hostless_timeout = setTimeout(() => {
                    if (channel_id in game_states) {
                        channelEmit(channel_id, 'finish', 'Your game has closed due to it not having a host')
                        game_states[channel_id].hostless_timeout = null
                        endGame(channel_id)
                    }
                }, hostless_timeout)
            }
            else if (game_states[channel_id].host_socket_id) {
                connection_exists = true
            }
            
            
            let player = getPlayerBySocketID(game_states[channel_id], socket.id)
            if (player != null) {
                
            }
            
            for (let player of game_states[channel_id].player_info) {
                if (player.socket_id == socket.id) {
                    player.socket_id = null
                    channelEmit(channel_id, 'kick update', {'seat_id' : player.seat_id})
                }
                else if (player.socket_id) {
                    connection_exists = true
                }
            }
            
            if (game_states[channel_id].spectators.includes(socket.id)) {
                game_states[channel_id].spectators.splice(game_states[channel_id].spectators.indexOf(socket.id), 1)
            }
            
            if (game_states[channel_id].spectators.length) {
                connection_exists = true
            }
             
        }
        else {
            connection_exists = null
        }
        
        if (ip in ip_connections) {
            ip_connections[ip]--
            if (ip_connections[ip] == 0) {
                delete ip_connections[ip]
                delete ip_requests[ip]
            }
        }
        printInfo()
        
        // Close the game as no remaining connections
        if (connection_exists == false && channel_id in game_states) {
            game_states[channel_id].clientless_timeout = setTimeout(() => {
                if (channel_id in game_states) {
                    game_states[channel_id].clientless_timeout = null
                    endGame(channel_id)
                }
            }, clientless_timeout)
        }
    })
}

module.exports = {
	init,
}