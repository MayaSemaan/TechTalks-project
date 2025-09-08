import mongoose ,{Document,Schema} from 'mongoose';
import bcrypt from 'bcryptjs';


export interface IUser extends
Document{
  name:string;
  email:string;
  password:string;
  role:'patient'|'family'|'doctor';
  createdAt:Date;
  updatedAt:Date;

  comparePassword(candidatePassword:string):Promise<boolean>;
}

const UserSchema:Schema = new Schema({
  name:{
    type:String, required:[true,'please provide a name'],
    trim:true,
    maxlength:[50,'Name cannot be more than 50 characters']
  },
  email:{
    type:String, required:[true,'Please provide an email'],
    unique:true,
    lowercase:true,
    trim:true,
   match:[/^[^\s@]+@[^\s@]+\.[^\s@]+$/,'Please provide a valid email']
  },
  password:{
    type:String, required:[true,'Please provide a password'],
    minlength:[6,'Password should at least 6 characters']
  },
  role:{
    type:String, enum:['patient','family','doctor'],
    required:[true,'Please specify a role']
  }
},{
  timestamps:true,
  toJSON:{
    transform:function(doc,ret){
      const {password, ...userwithoutpassword}=ret;
      return userwithoutpassword;
    }
  }
});
//hash password before saving
UserSchema.pre<IUser>('save',async function(next){
  if(!this.isModified("password")) return next();

  try{
    const salt= await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password,salt);
    next();
  }
  catch(error:any){
    next(error);
  }
});
//compare password method 
UserSchema.methods.comparePassword=
 async function(candidatePassword:string):Promise<boolean>{
  return bcrypt.compare(candidatePassword,this.password);
};
//prevent duplication model 
export default mongoose.models.User|| mongoose.model<IUser>('User',UserSchema);