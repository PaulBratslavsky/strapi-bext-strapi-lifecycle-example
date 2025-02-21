// TODO: This only applies to users-permissions plugin.
// For anything else please reference the following guide:
// https://strapi.io/blog/what-are-document-service-middleware-and-what-happened-to-lifecycle-hooks-1

import type { Core } from "@strapi/strapi";

function generateUsername(): string {
  const adjectives = ["Swift", "Brave", "Clever", "Mighty", "Silent", "Witty", "Bold", "Eager"];
  const nouns = ["Tiger", "Eagle", "Shark", "Wolf", "Falcon", "Panda", "Dragon", "Hawk"];
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit number

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

async function checkIfUserProfileExists(userId: string) {
  console.log("FROM FIND USER PROFILE FUNCTION");
  console.log("userId", userId);

  const existingUserProfile = await strapi
    .documents("api::user-profile.user-profile")
    .findMany({
      filters: {
        user: {
          id: {
            $eq: userId,
          },
        },
      },
    });

  return existingUserProfile;
}

async function createUserProfile(userId: string, fullName: string, bio: string) {
  const userProfile = await checkIfUserProfileExists(userId);

  if (userProfile.length > 0) {
    console.log("USER PROFILE ALREADY EXISTS");
    return;
  }

  await strapi.documents("api::user-profile.user-profile").create({
    data: {
      user: userId,
      fullName: fullName,
      bio: bio,
    },
  });
}

async function deleteUserProfile(userId: string) {
  const userProfile = await checkIfUserProfileExists(userId);

  if (userProfile.length > 0) {
    await strapi.documents("api::user-profile.user-profile").delete({
      documentId: userProfile[0].documentId,
    });
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // registering a subscriber
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"], // Specify the User model

      async afterCreate(event: any) {
        const { result, params } = event;
        const fullName = params?.data?.fullName || generateUsername();
        const bio = params?.data?.bio || "No bio yet";
        await createUserProfile(result.id, fullName, bio);
      },


      async beforeDelete(event: any) {
        const { params } = event;
        const idToDelete = params?.where?.id;
        await deleteUserProfile(idToDelete);
      },
    });

    
  },
};