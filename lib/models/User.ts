import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRepository {
  id: number | string;
  name: string;
  full_name: string;
  html_url: string;
  description?: string;
  language?: string;
  stargazers_count?: number;
  watchers_count?: number;
  forks_count?: number;
  private?: boolean;
  created_at?: string;
  updated_at?: string;
  pushed_at?: string;
}

export interface IUser extends Document {
  email: string;
  username: string;
  name?: string;
  githubId: string;
  photoURL?: string;
  aid?: string;
  useCase?: string;
  teamSize?: string;
  fieldOfWork?: string;
  repositories: IRepository[];
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>(
  {
    id: { type: Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    full_name: { type: String, required: true },
    html_url: { type: String, required: true },
    description: { type: String, default: "" },
    language: { type: String, default: "" },
    stargazers_count: { type: Number, default: 0 },
    watchers_count: { type: Number, default: 0 },
    forks_count: { type: Number, default: 0 },
    private: { type: Boolean, default: false },
    created_at: { type: String, default: "" },
    updated_at: { type: String, default: "" },
    pushed_at: { type: String, default: "" },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    githubId: {
      type: String,
      required: true,
      index: true,
    },
    photoURL: {
      type: String,
      default: "",
    },
    aid: {
      type: String,
      default: "",
    },
    useCase: {
      type: String,
      default: "",
    },
    teamSize: {
      type: String,
      default: "",
    },
    fieldOfWork: {
      type: String,
      default: "",
    },
    repositories: {
      type: [RepositorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Prevent model recompilation error in Next.js development HMR
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema, "users");

export default User;
