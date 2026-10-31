"use client";
import {useFormStatus} from "react-dom";
import type {ButtonHTMLAttributes,ReactNode} from "react";
export function SubmitButton({children,disabled,className="primary-button",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{children:ReactNode}){
 const {pending}=useFormStatus();
 return <button {...props} type="submit" disabled={disabled||pending} className={className+" submit-feedback"} aria-busy={pending}>
   {pending?<><span className="submit-spinner" aria-hidden="true"/>Menyimpan...</>:children}
 </button>;
}
