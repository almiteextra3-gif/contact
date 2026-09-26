const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  });
}

function now() {
  return Date.now();
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function getToken(request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;
}

async function getUser(request, env) {
  const token = getToken(request);

  if (!token) return null;

  return await env.DB.prepare(`
    SELECT users.id,
           users.username,
           users.email,
           users.role
    FROM sessions
    JOIN users
    ON users.id = sessions.user_id
    WHERE sessions.token = ?
    AND sessions.expires_at > ?
  `)
  .bind(token, now())
  .first();
}

async function requireUser(request, env) {
  return await getUser(request, env);
}

async function requireAdmin(request, env) {
  const user = await getUser(request, env);

  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
}


const defaultSettings = {
  status: "Available for opportunities",
  title: "Let's build something great.",
  description:
    "Have an idea, project or opportunity? Send me a message.",
  email: "almiteextra2@gmail.com",
  contactText: "Contact Me",
  loginText: "Login",
  heroButton: "Contact Me",
  submitButton: "Send Message",
  navContact: "Contact",
  primary: "#7c3aed",
  secondary: "#06b6d4",
  background:
    "https://images.unsplash.com/photo-1519608487953-e999c86e7455"
};


export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null,{
        status:204,
        headers:corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {

      if(request.method==="GET" && path==="/") {
        return json({
          ok:true,
          service:"Almite Chat API",
          status:"online"
        });
      }


      if(request.method==="POST" && path==="/register") {

        const body = await request.json();

        const username = String(body.username || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if(!username || !email || !password){
          return json({
            ok:false,
            error:"Missing fields"
          },400);
        }


        const exists = await env.DB.prepare(`
          SELECT id FROM users
          WHERE username=? OR email=?
        `)
        .bind(username,email)
        .first();


        if(exists){
          return json({
            ok:false,
            error:"Already exists"
          },409);
        }


        const result = await env.DB.prepare(`
          INSERT INTO users
          (username,email,password_hash,role,created_at)
          VALUES(?,?,?,?,?)
        `)
        .bind(
          username,
          email,
          await hashPassword(password),
          "user",
          now()
        )
        .run();


        return json({
          ok:true,
          userId:result.meta.last_row_id
        },201);
      }      if(request.method==="POST" && path==="/login") {

        const body = await request.json();

        const login = String(body.login || "").trim();
        const password = String(body.password || "");

        if(!login || !password){
          return json({
            ok:false,
            error:"Login and password required"
          },400);
        }


        const user = await env.DB.prepare(`
          SELECT id,username,email,role
          FROM users
          WHERE (username=? OR email=?)
          AND password_hash=?
        `)
        .bind(
          login,
          login.toLowerCase(),
          await hashPassword(password)
        )
        .first();


        if(!user){
          return json({
            ok:false,
            error:"Invalid credentials"
          },401);
        }


        const bytes = crypto.getRandomValues(
          new Uint8Array(32)
        );

        const token = [...bytes]
          .map(b=>b.toString(16).padStart(2,"0"))
          .join("");


        await env.DB.prepare(`
          INSERT INTO sessions
          (token,user_id,expires_at)
          VALUES(?,?,?)
        `)
        .bind(
          token,
          user.id,
          now()+604800000
        )
        .run();


        return json({
          ok:true,
          token,
          user
        });
      }



      if(request.method==="GET" && path==="/me"){

        const user = await requireUser(
          request,
          env
        );


        if(!user){
          return json({
            ok:false,
            error:"Not logged in"
          },401);
        }


        return json({
          ok:true,
          user
        });
      }




      if(request.method==="POST" && path==="/logout"){

        const token = getToken(request);

        if(token){

          await env.DB.prepare(`
            DELETE FROM sessions
            WHERE token=?
          `)
          .bind(token)
          .run();

        }


        return json({
          ok:true
        });
      }





      if(request.method==="GET" && path==="/settings"){

        const row = await env.DB.prepare(`
          SELECT settings
          FROM site_settings
          WHERE id=1
        `)
        .first();


        let settings = defaultSettings;


        if(row && row.settings){

          try{

            settings = {
              ...defaultSettings,
              ...JSON.parse(row.settings)
            };

          }catch{

            settings = defaultSettings;

          }

        }


        return json({
          ok:true,
          settings
        });
      }




      if(request.method==="PUT" && path==="/admin/settings"){

        const admin = await requireAdmin(
          request,
          env
        );


        if(!admin){

          return json({
            ok:false,
            error:"Admin required"
          },403);

        }


        const body = await request.json();


        const settings = {
          ...defaultSettings,
          ...(body.settings || {})
        };


        await env.DB.prepare(`
          INSERT INTO site_settings
          (id,settings,updated_at)
          VALUES(1,?,?)
          ON CONFLICT(id)
          DO UPDATE SET
          settings=?,
          updated_at=?
        `)
        .bind(
          JSON.stringify(settings),
          now(),
          JSON.stringify(settings),
          now()
        )
        .run();


        return json({
          ok:true,
          settings
        });

      }      if(request.method==="GET" && path==="/messages"){

        const user = await requireUser(
          request,
          env
        );


        if(!user){
          return json({
            ok:false,
            error:"Login required"
          },401);
        }


        let conversation = await env.DB.prepare(`
          SELECT *
          FROM conversations
          WHERE user_id=?
          ORDER BY id DESC
          LIMIT 1
        `)
        .bind(user.id)
        .first();



        if(!conversation){

          const time = now();

          const result = await env.DB.prepare(`
            INSERT INTO conversations
            (user_id,created_at,updated_at)
            VALUES(?,?,?)
          `)
          .bind(
            user.id,
            time,
            time
          )
          .run();


          conversation = {
            id: result.meta.last_row_id
          };

        }



        const messages = await env.DB.prepare(`
          SELECT *
          FROM messages
          WHERE conversation_id=?
          ORDER BY id ASC
        `)
        .bind(conversation.id)
        .all();



        return json({
          ok:true,
          conversation,
          messages:messages.results || []
        });

      }




      if(request.method==="POST" && path==="/messages"){

        const user = await requireUser(
          request,
          env
        );


        if(!user){

          return json({
            ok:false,
            error:"Login required"
          },401);

        }


        const body = await request.json();

        const message = String(
          body.message || ""
        ).trim();


        if(!message){

          return json({
            ok:false,
            error:"Message empty"
          },400);

        }



        let conversation =
        await env.DB.prepare(`
          SELECT id
          FROM conversations
          WHERE user_id=?
          ORDER BY id DESC
          LIMIT 1
        `)
        .bind(user.id)
        .first();



        if(!conversation){

          const result =
          await env.DB.prepare(`
            INSERT INTO conversations
            (user_id,created_at,updated_at)
            VALUES(?,?,?)
          `)
          .bind(
            user.id,
            now(),
            now()
          )
          .run();


          conversation={
            id:result.meta.last_row_id
          };

        }



        await env.DB.prepare(`
          INSERT INTO messages
          (conversation_id,sender_id,sender_role,message,created_at)
          VALUES(?,?,?,?,?)
        `)
        .bind(
          conversation.id,
          user.id,
          "user",
          message,
          now()
        )
        .run();



        return json({
          ok:true
        });

      }




      return json({
        ok:false,
        error:"Route not found"
      },404);



    } catch(error){

      return json({
        ok:false,
        error:error.message
      },500);

    }

  }
};