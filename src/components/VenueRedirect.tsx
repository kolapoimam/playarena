import { useEffect } from "react";
     import { useParams, useNavigate } from "react-router-dom";
     import { supabase } from "@/integrations/supabase/client";

     const VenueRedirect = () => {
       const { id } = useParams<{ id: string }>();
       const navigate = useNavigate();

       useEffect(() => {
         const fetchSlug = async () => {
           try {
             const { data, error } = await supabase
               .from("venues")
               .select("slug")
               .eq("id", id)
               .single();
             if (error) throw error;
             navigate(`/venue/${data.slug}`, { replace: true });
           } catch (error) {
             navigate("/not-found", { replace: true });
           }
         };
         if (id) fetchSlug();
       }, [id, navigate]);

       return null;
     };

     export default VenueRedirect;
