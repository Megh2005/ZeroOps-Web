import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommit extends Document {
  sha: string;
  userEmail: string;
  repoId: string;
  repoName: string;
  branch: string;
  path: string;
  action: "create" | "update" | "delete";
  message: string;
  content: string | null;
  previousContent: string | null;
  previousSha: string | null;
  shaAfter: string | null;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommitSchema = new Schema<ICommit>(
  {
    sha: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    repoId: {
      type: String,
      required: true,
    },
    repoName: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
      default: "main",
    },
    path: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: null,
    },
    previousContent: {
      type: String,
      default: null,
    },
    previousSha: {
      type: String,
      default: null,
    },
    shaAfter: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
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

export const Commit: Model<ICommit> =
  mongoose.models.Commit || mongoose.model<ICommit>("Commit", CommitSchema, "commits");

export default Commit;
