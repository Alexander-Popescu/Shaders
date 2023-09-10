precision mediump float;

//constants
const int MAX_STEPS = 1000;
const float MAX_DIST = 100.0;
const float HIT_THRESHOLD = 0.001;

float sdfSphere(vec3 pos, vec3 spherePos, float sphereRadius)
{
    //returns the distance to the closest point on the sphere
    return length(pos - spherePos) - sphereRadius;
}

float sdfPlane(vec3 pos, vec3 planePos, vec3 planeNormal)
{
    //returns the distance to the closest point on the plane
    return dot(pos - planePos, planeNormal);
}

float sdfTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float smoothMin(float a,float b,float k)
{
    float h = clamp( 0.5 + 0.5 * (b - a)/k, 0.0, 1.0 );
    return mix( b, a, h) - k*h*(1.0-h);
}

float scene(vec3 pos)
{
    //returns the distance to the closest object

    float distance = 1000.0;
    float smoothness = 1.0;

    //spheres
    vec3 spherePos = vec3(0.0, cos(iTime), 5.0);
    float sphereRadius = 1.0;
    float sphereDist = sdfSphere(pos, spherePos, sphereRadius);

    distance = sphereDist;

    //plane
    vec3 planePos = vec3(0.0, -1.0, 0.0);
    vec3 planeNormal = vec3(0.0, 1.0, 0.0);
    float planeDist = sdfPlane(pos, planePos, planeNormal);

    distance = smoothMin(planeDist, sphereDist, smoothness);

    //torus
    vec3 torusPos = vec3(0.0, -1.0, 5.0);
    vec2 torusSize = vec2(2.0, 0.3);
    float torusDist = sdfTorus(pos - torusPos, torusSize);
   
    distance = smoothMin(torusDist, distance, smoothness);

    return distance;
}

vec3 getNormal(in vec3 pos)
{
    //returns the normal vector approximation
    vec3 eps = vec3(0.001, 0.0, 0.0);
    vec3 normal = vec3(
        scene(pos + eps.xyy) - scene(pos - eps.xyy),
        scene(pos + eps.yxy) - scene(pos - eps.yxy),
        scene(pos + eps.yyx) - scene(pos - eps.yyx));
    return normalize(normal);
}

float raymarch(in vec3 rayOrigin, in vec3 rayDirection)
{
    //returns the distance to the closest object from the given position

    float totalDistance = 0.0;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        //get distance to scene
        float dist = scene(rayOrigin + rayDirection * totalDistance);

        //if we are close enough to an object, we hit it
        if (dist < HIT_THRESHOLD)
        {
            return totalDistance;
        }

        totalDistance += dist;

        //dont render past max distance
        if (totalDistance >= MAX_DIST)
        {
            break;
        }
    }

    return totalDistance;
}

vec3 render(in vec3 rayOrigin, in vec3 rayDirection)
{
    //base hit color
    vec3 color = vec3(1.0);

    //calculates the color to render at the pixel that corrosponds to this ray
    float totalDistance = 0.0;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        //get distance to scene
        float dist = scene(rayOrigin + rayDirection * totalDistance);

        //if we are close enough to an object, we hit it
        if (dist < HIT_THRESHOLD)
        {
            //calculate normal vector at the collision
            vec3 collisionPoint = rayOrigin + rayDirection * totalDistance;
            //general vector calculation
            vec3 normalVector = getNormal(collisionPoint);

            //calculate light vector
            vec3 lightOrigin = vec3(0.0, 2.0, 0.0);
            lightOrigin.xz += vec2(2.0 * sin(28.0), cos(28.0)) * 2.0;
            vec3 lightVector = normalize(lightOrigin - collisionPoint);

            //calculate light intensity
            //diffuse,clamp to avoid -1
            float lightIntensity = clamp(dot(lightVector, normalVector), 0.0, 1.0);

            //calculate shadow by ray marching from plane to lightsource
            float lightMarchDistance = raymarch(collisionPoint + normalVector * 0.15, lightVector);
            if (lightMarchDistance < length(lightOrigin - collisionPoint))
            {
                lightIntensity *= 0.1;
            }

            return vec3(lightIntensity, lightIntensity, lightIntensity);
        }

        totalDistance += dist;

        //dont render past max distance
        if (totalDistance >= MAX_DIST)
        {
            break;
        }
    }

    //return background color
    return vec3(0.0, 0.0, 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec3 color = vec3(1.0);

    vec2 uv = (fragCoord - 0.5 * iResolution.xy)/iResolution.y;

    //camera system

    //ray origin at 0,0,0
    vec3 rayOrigin = vec3(0.0, 1.2, 0.0);

    //ray direction towards an imaginary grid of the resolution, 1 away for now
    vec3 rayDirection = vec3(uv.x, uv.y - 0.3, 1.0);

    //find color to render in that direction
    color = render(rayOrigin, rayDirection);

    //set color
    fragColor = vec4(color, 1.0);
}