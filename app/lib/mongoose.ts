import mongoose, {Mongoose} from "mongoose";

const MONGODB_URL= process.env.MONGODB_URL as string ;
if (!MONGODB_URL)throw new Error ("MongoDB URL missing");

interface Cached{
  conn:Mongoose | null;
  promise:Promise<Mongoose>|null;
}
let cached :Cached=(global as any)._mongoose;

if(!cached){
  cached={conn:null,promise:null};
  (global as any)._mongoose=cached;
}
async function dbConnect():Promise<Mongoose>{
  if (cached.conn) return cached.conn;


  if(!cached.promise){
    cached.promise= mongoose.connect(MONGODB_URL,{bufferCommands:false});
  }
  try{
  cached.conn=await cached.promise;
  return cached.conn;
  }
  catch(error){
    cached.promise=null;
    throw new Error(`Database connection failed: ${error}`);
    
  }
}
export default dbConnect;