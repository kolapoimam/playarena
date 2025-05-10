import { useEffect } from "react";
     import { useParams, useNavigate } from "react-router-dom";
     import { supabase } from "@/integrations/supabase/client";

     const MatchRedirect = () => {
       const { id } = useParams<{ id: string }>();
       const navigate = useNavigate();

       useEffect(() => {
         const fetchSlug = async () => {
           try {
             const { data, error } = await supabase
               .from("matches")
               .select("slug")
               .eq("id", id)
               .single();
             if (error) throw error;
             navigate(`/match/${data.slug}`, { replace: true });
           } catch (error) {
             navigate("/not-found", { replace: true });
           }
         };
         if (id) fetchSlug();
       }, [id, navigate]);

       return null;
     };

     export default MatchRedirect;
