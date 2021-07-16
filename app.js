const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  //console.log(jwtToken);
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token1");
  } else {
    //const payload = { username: username };
    jwt.verify(jwtToken, "MY SECRET KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token2");
      } else {
        request.username = payload.username;
        //console.log(payload.username);
        next();
      }
    });
  }
};

//API 1 Register User
app.post("/register/", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const userQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(userQuery);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = `
            insert into user(
                name,username,password,gender) values(
                    '${name}',
                    '${username}',
                    '${hashedPassword}',
                    '${gender}');`;
      const dbResponse = await db.run(insertQuery);
      const userId = dbResponse.lastID;
      console.log(userId);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

//API 2 login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUser = `select * from user where 
    username='${username}';`;
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordMatch = await bcrypt.compare(password, dbUser.password);
    console.log(dbUser.password, password, passwordMatch);
    if (passwordMatch === false) {
      response.status(200);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY SECRET KEY");
      response.send({ jwtToken });
    }
  }
});

//API 3 user tweets feed
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const username = request.username;
  console.log(username);
  const selectQuery = `select u.username,t.tweet,t.date_time from
    user u join tweet t on u.user_id=t.user_id
    join follower f on u.user_id=f.follower_user_id
    where username='${username}'
    order by t.date_time desc
    limit 4;`;
  const dbResponse = await db.all(selectQuery);
  response.send(dbResponse);
});

//API 4 user following
app.get("/user/following/", authenticateToken, async (request, response) => {
  const username = request.username;
  const idQuery = `select user_id from user where username='${username}'`;
  const dbUser = await db.get(idQuery);
  const selectQuery = `select distinct u.username as name from user u join
    follower f on u.user_id=f.following_user_id
    where f.follower_user_id='${dbUser.user_id}';`;
  const dbResponse = await db.all(selectQuery);
  response.send(dbResponse);
});

//API 5 user followers
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const username = request.username;
  const idQuery = `select user_id from user where username='${username}'`;
  const dbUser = await db.get(idQuery);
  const selectQuery = `select distinct u.username as name from user u join
    follower f on u.user_id=f.follower_user_id
    where f.following_user_id=${dbUser.user_id};`;
  const dbResponse = await db.all(selectQuery);
  response.send(dbResponse);
});

//API 6 get tweet
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const tweetQuery = `select `;
});
