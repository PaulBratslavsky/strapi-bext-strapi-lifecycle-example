// TODO: This only applies to the users-permissions plugin.
// For anything else, please reference the following guide:
// https://strapi.io/blog/what-are-document-service-middleware-and-what-happened-to-lifecycle-hooks-1

import type { Core } from "@strapi/strapi";

/**
 * Generates a random username by combining an adjective, a noun, and a 4-digit number.
 * @returns {string} A randomly generated username.
 */
function generateUsername(): string {
  const adjectives = ["Swift", "Brave", "Clever", "Mighty", "Silent", "Witty", "Bold", "Eager"];
  const nouns = ["Tiger", "Eagle", "Shark", "Wolf", "Falcon", "Panda", "Dragon", "Hawk"];
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit random number

  // Select a random adjective and noun from the arrays
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  // Return the concatenated username
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

/**
 * Checks if a user profile already exists in the database for a given user ID.
 * @param {string} userId - The ID of the user to check.
 * @returns {Promise<any>} The user profile if found, otherwise an empty array.
 */
async function checkIfUserProfileExists(userId: string) {
  console.log("FROM FIND USER PROFILE FUNCTION");
  console.log("userId", userId);

  // Query the database to find any existing user profile associated with the given user ID
  const existingUserProfile = await strapi
    .documents("api::user-profile.user-profile")
    .findMany({
      filters: {
        user: {
          id: {
            $eq: userId, // Filter where the user ID matches
          },
        },
      },
    });

  return existingUserProfile;
}

/**
 * Creates a new user profile if one does not already exist.
 * @param {string} userId - The ID of the user for whom the profile is being created.
 * @param {string} fullName - The full name of the user.
 * @param {string} bio - The user's bio.
 */
async function createUserProfile(userId: string, fullName: string, bio: string) {
  const userProfile = await checkIfUserProfileExists(userId);

  // If a profile already exists, log a message and return without creating a new one
  if (userProfile.length > 0) {
    console.log("USER PROFILE ALREADY EXISTS");
    return;
  }

  // Create a new user profile with the provided user ID, full name, and bio
  await strapi.documents("api::user-profile.user-profile").create({
    data: {
      user: userId,
      fullName: fullName,
      bio: bio,
    },
  });
}

/**
 * Deletes a user's profile if it exists.
 * @param {string} userId - The ID of the user whose profile should be deleted.
 */
async function deleteUserProfile(userId: string) {
  const userProfile = await checkIfUserProfileExists(userId);

  // If a profile exists, delete it from the database
  if (userProfile.length > 0) {
    await strapi.documents("api::user-profile.user-profile").delete({
      documentId: userProfile[0].documentId, // Use the document ID of the first found profile
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
    // Registering a lifecycle subscriber for the users-permissions plugin
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"], // Applies only to users in users-permissions

      /**
       * Lifecycle hook triggered after a new user is created.
       * Ensures that a user profile is created with either the provided full name and bio
       * or a default generated username and bio if missing.
       * @param {any} event - The event object containing the created user's details.
       */
      async afterCreate(event: any) {
        const { result, params } = event;
        const fullName = params?.data?.fullName || generateUsername();
        const bio = params?.data?.bio || "No bio yet";
        await createUserProfile(result.id, fullName, bio);
      },

      /**
       * Lifecycle hook triggered before a user is deleted.
       * Ensures that the associated user profile is also removed.
       * @param {any} event - The event object containing the details of the user being deleted.
       */
      async beforeDelete(event: any) {
        const { params } = event;
        const idToDelete = params?.where?.id;
        await deleteUserProfile(idToDelete);
      },
    });
  },
};
